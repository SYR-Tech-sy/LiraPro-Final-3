import { Router, type IRouter, type Response } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sendPushToAll } from "./push.js";

const router: IRouter = Router();

// ── SSE Client Registry ────────────────────────────────────────────────────────

interface SseClient {
  userId: string;
  res: Response;
}

const sseClients = new Map<string, SseClient>();
let connCounter = 0;

function broadcastSSE(event: string, data: unknown, targetUserId?: string): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, client] of sseClients) {
    if (targetUserId && client.userId !== targetUserId) continue;
    try { client.res.write(payload); } catch { /* connection closed */ }
  }
}

// GET /api/notifications/stream — SSE real-time channel
// Auth via Bearer header OR ?token= query param (EventSource compat)
router.get("/notifications/stream", async (req, res): Promise<void> => {
  const { verifySupabaseToken } = await import("../lib/supabase-admin.js");
  const tokenFromHeader = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  const tokenFromQuery = (req.query.token as string | undefined) ?? "";
  const token = tokenFromHeader || tokenFromQuery;
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await verifySupabaseToken(token);
  if (!user) { res.status(401).json({ error: "Invalid token" }); return; }

  const userId = user.id;
  const clientId = `${userId}-${connCounter++}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);
  sseClients.set(clientId, { userId, res });

  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch { clearInterval(heartbeat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

const __dir = dirname(fileURLToPath(import.meta.url));
const NOTIFICATIONS_FILE = join(__dir, "../notifications.json");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "SYRSYP2026ADMIN";

interface Notification {
  id: number;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "price";
  icon: string;
  sender?: string;
  recipient?: "all" | "specific";
  targetWalletId?: string;
  targetName?: string;
  createdAt: string;
}

function readNotifications(): Notification[] {
  try {
    if (!existsSync(NOTIFICATIONS_FILE)) return [];
    const raw = readFileSync(NOTIFICATIONS_FILE, "utf-8");
    return JSON.parse(raw) as Notification[];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), "utf-8");
}

// GET /api/notifications — public
router.get("/notifications", (_req, res): void => {
  const notifications = readNotifications();
  // Return latest 50, newest first
  res.json(notifications.slice(-50).reverse());
});

// POST /api/notifications — admin only
router.post("/notifications", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const { title, body, type = "info", icon = "bell", sender } = req.body as Notification;
  if (!title || !body) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }

  const notifications = readNotifications();
  const newNotification: Notification = {
    id: Date.now(),
    title,
    body,
    type: type as Notification["type"],
    icon,
    ...(sender ? { sender } : {}),
    recipient: "all",
    createdAt: new Date().toISOString(),
  };
  notifications.push(newNotification);
  saveNotifications(notifications);

  req.log.info({ id: newNotification.id }, "Notification created");
  broadcastSSE("notification", newNotification);
  res.json(newNotification);
});

const USER_NOTIFICATIONS_FILE = join(__dir, "../user-notifications.json");

function readUserNotifications(): Record<string, Notification[]> {
  try {
    if (!existsSync(USER_NOTIFICATIONS_FILE)) return {};
    return JSON.parse(readFileSync(USER_NOTIFICATIONS_FILE, "utf-8")) as Record<string, Notification[]>;
  } catch { return {}; }
}

function saveUserNotifications(data: Record<string, Notification[]>): void {
  writeFileSync(USER_NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/notifications/user — fetch per-user notifications by walletId
router.get("/notifications/user", (req, res): void => {
  const walletId = req.query.walletId as string;
  if (!walletId) { res.status(400).json({ error: "walletId required" }); return; }
  const all = readUserNotifications();
  const userMsgs = (all[walletId] ?? []).slice(0, 50);
  res.json(userMsgs);
});

// POST /api/notifications/user — admin sends notification to a specific user
router.post("/notifications/user", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const { walletId, title, body, type = "info", sender, targetName } = req.body as {
    walletId: string; title: string; body: string; type?: string; sender?: string; targetName?: string;
  };
  if (!walletId || !title || !body) {
    res.status(400).json({ error: "walletId, title, body required" });
    return;
  }
  const all = readUserNotifications();
  if (!all[walletId]) all[walletId] = [];
  const newMsg: Notification = {
    id: Date.now(),
    title,
    body,
    type: type as Notification["type"],
    icon: "admin",
    ...(sender ? { sender } : {}),
    recipient: "specific",
    targetWalletId: walletId,
    ...(targetName ? { targetName } : {}),
    createdAt: new Date().toISOString(),
  };
  all[walletId].unshift(newMsg);
  all[walletId] = all[walletId].slice(0, 30);
  saveUserNotifications(all);
  req.log.info({ walletId, id: newMsg.id }, "User notification sent");
  broadcastSSE("notification", newMsg, walletId);
  res.json(newMsg);
});

// PUT /api/notifications/:id — admin only (edit without re-sending)
router.put("/notifications/:id", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id ?? "0");
  const { title, body } = req.body as { title?: string; body?: string };
  const notifications = readNotifications();
  const idx = notifications.findIndex(n => n.id === id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  if (title) notifications[idx]!.title = title;
  if (body) notifications[idx]!.body = body;
  saveNotifications(notifications);
  res.json(notifications[idx]);
});

// PUT /api/notifications/user/:walletId/:id — admin only
router.put("/notifications/user/:walletId/:id", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const { walletId, id: idStr } = req.params as { walletId: string; id: string };
  const id = parseInt(idStr ?? "0");
  const { title, body } = req.body as { title?: string; body?: string };
  const all = readUserNotifications();
  const userMsgs = all[walletId] ?? [];
  const idx = userMsgs.findIndex(n => n.id === id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  if (title) userMsgs[idx]!.title = title;
  if (body) userMsgs[idx]!.body = body;
  all[walletId] = userMsgs;
  saveUserNotifications(all);
  res.json(userMsgs[idx]);
});

// DELETE /api/notifications/user/:walletId/all — user self-clears all their notifications (no auth needed)
router.delete("/notifications/user/:walletId/all", (req, res): void => {
  const { walletId } = req.params as { walletId: string };
  if (!walletId) { res.status(400).json({ error: "walletId required" }); return; }
  const all = readUserNotifications();
  all[walletId] = [];
  saveUserNotifications(all);
  res.json({ success: true });
});

// DELETE /api/notifications/user/:walletId/:id — admin only
router.delete("/notifications/user/:walletId/:id", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const { walletId, id: idStr } = req.params as { walletId: string; id: string };
  const id = parseInt(idStr ?? "0");
  const all = readUserNotifications();
  if (all[walletId]) { all[walletId] = all[walletId].filter(n => n.id !== id); }
  saveUserNotifications(all);
  res.json({ success: true });
});

// ── View Tracking ─────────────────────────────────────────────────────────────

const VIEWS_FILE = join(__dir, "../notification-views.json");

interface ViewRecord { walletId: string; viewedAt: string; }
type ViewsData = Record<string, ViewRecord[]>;

function readViews(): ViewsData {
  try {
    if (!existsSync(VIEWS_FILE)) return {};
    return JSON.parse(readFileSync(VIEWS_FILE, "utf-8")) as ViewsData;
  } catch { return {}; }
}

function saveViews(data: ViewsData): void {
  writeFileSync(VIEWS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// POST /api/notifications/:id/view — user marks notification as viewed
router.post("/notifications/:id/view", (req, res): void => {
  const id = req.params.id ?? "";
  const { walletId } = req.body as { walletId?: string };
  if (!walletId) { res.status(400).json({ error: "walletId required" }); return; }
  const views = readViews();
  if (!views[id]) views[id] = [];
  const already = views[id].some(v => v.walletId === walletId);
  if (!already) {
    views[id].push({ walletId, viewedAt: new Date().toISOString() });
    saveViews(views);
  }
  res.json({ success: true, count: views[id].length });
});

// GET /api/notifications/:id/viewers — admin only
router.get("/notifications/:id/viewers", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const id = req.params.id ?? "";
  const views = readViews();
  const list = views[id] ?? [];
  res.json({ id, count: list.length, viewers: list });
});

// DELETE /api/notifications/:id — admin only
router.delete("/notifications/:id", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "0");
  const notifications = readNotifications().filter(n => n.id !== id);
  saveNotifications(notifications);
  res.json({ success: true });
});

// ── Live Broadcast (in-memory, resets on restart) ─────────────────────────────

interface BroadcastData {
  speed?: 'slow' | 'normal' | 'fast';
  text: string;
  textColor: string;
  countdown?: number;
  countdownColor?: string;
  startedAt: string;
  endsAt?: string;
}

let activeBroadcast: BroadcastData | null = null;

// GET /api/broadcast
router.get("/broadcast", (_req, res): void => {
  if (!activeBroadcast) { res.json(null); return; }
  if (activeBroadcast.endsAt && new Date(activeBroadcast.endsAt) < new Date()) {
    activeBroadcast = null;
    res.json(null);
    return;
  }
  res.json(activeBroadcast);
});

// POST /api/broadcast — admin starts broadcast
router.post("/broadcast", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const { text, textColor = "#ffffff", countdown, countdownColor = "#ff4444", speed = "normal" } = req.body as {
    text: string; textColor?: string; countdown?: number; countdownColor?: string; speed?: 'slow' | 'normal' | 'fast';
  };
  if (!text?.trim()) { res.status(400).json({ error: "text required" }); return; }
  activeBroadcast = {
    text: text.trim(),
    textColor,
    speed,
    startedAt: new Date().toISOString(),
    ...(countdown && countdown > 0 ? {
      countdown,
      countdownColor,
      endsAt: new Date(Date.now() + countdown * 1000).toISOString(),
    } : {}),
  };
  void sendPushToAll("🔴 بث مباشر — LiraPro", text.trim(), "/app/home").catch(() => {});
  broadcastSSE("broadcast", activeBroadcast);
  res.json(activeBroadcast);
});

// DELETE /api/broadcast — admin stops broadcast
router.delete("/broadcast", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  activeBroadcast = null;
  broadcastSSE("broadcast_end", {});
  res.json({ success: true });
});

export default router;
