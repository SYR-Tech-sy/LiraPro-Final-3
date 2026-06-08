import { Router, type IRouter, type Response } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { db } from "@workspace/db";
import { notificationLogTable } from "@workspace/db";
import { and, gt, eq, or, isNull, desc } from "drizzle-orm";
import { sendPushToAll, sendPushToUser } from "./push.js";
import { requireSupabaseAuth } from "../middlewares/requireSupabaseAuth.js";

const router: IRouter = Router();

// ── SSE Client Registry ────────────────────────────────────────────────────────

interface SseClient { userId: string; res: Response; }
const sseClients = new Map<string, SseClient>();
let connCounter = 0;

function broadcastSSE(event: string, data: unknown, targetUserId?: string): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, client] of sseClients) {
    if (targetUserId && client.userId !== targetUserId) continue;
    try { client.res.write(payload); } catch { /* closed */ }
  }
}

// GET /api/notifications/stream — SSE real-time channel
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
  req.on("close", () => { clearInterval(heartbeat); sseClients.delete(clientId); });
});

// ── Notification dedup & DB logging ──────────────────────────────────────────

function makeNotifDedup(title: string, body: string, recipientType: string, targetUserId?: string): string {
  return createHash("sha256")
    .update(`${title}::${body}::${recipientType}::${targetUserId ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

async function isDuplicate(dedupHash: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - 60_000);
    const rows = await db
      .select({ logId: notificationLogTable.logId })
      .from(notificationLogTable)
      .where(and(eq(notificationLogTable.dedupHash, dedupHash), gt(notificationLogTable.createdAt, cutoff)))
      .limit(1);
    return rows.length > 0;
  } catch { return false; }
}

/**
 * Write notification to DB as 'queued'. Returns logId (or null on error).
 * This is the primary write path — notification_log IS the notification store.
 */
async function logNotification(opts: {
  notifId: number; title: string; body: string; type: string; icon: string;
  recipientType: string; targetUserId?: string; actionUrl?: string;
}): Promise<number | null> {
  try {
    const dedupHash = makeNotifDedup(opts.title, opts.body, opts.recipientType, opts.targetUserId);
    const rows = await db
      .insert(notificationLogTable)
      .values({
        notifId: opts.notifId,
        title: opts.title,
        body: opts.body,
        type: opts.type,
        icon: opts.icon,
        recipientType: opts.recipientType,
        targetUserId: opts.targetUserId ?? null,
        actionUrl: opts.actionUrl ?? "/app/home",
        status: "queued",
        dedupHash,
      })
      .returning({ logId: notificationLogTable.logId });
    return rows[0]?.logId ?? null;
  } catch { return null; }
}

async function updateNotifLogStatus(logId: number, status: "sent" | "failed" | "delivered" | "read"): Promise<void> {
  try {
    await db
      .update(notificationLogTable)
      .set({ status, ...(status === "sent" ? { sentAt: new Date() } : {}) })
      .where(eq(notificationLogTable.logId, logId));
  } catch { /* non-critical */ }
}

// ── JSON storage (keep as write mirror for legacy admin panel compat) ─────────

const __dir = dirname(fileURLToPath(import.meta.url));
const NOTIFICATIONS_FILE = join(__dir, "../notifications.json");
const USER_NOTIFICATIONS_FILE = join(__dir, "../user-notifications.json");
const VIEWS_FILE = join(__dir, "../notification-views.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "SYRSYP2026ADMIN";

interface NotifJson {
  id: number; title: string; body: string;
  type: "info" | "warning" | "success" | "price";
  icon: string; sender?: string;
  recipient?: "all" | "specific"; targetWalletId?: string; targetName?: string;
  createdAt: string;
}

function readNotifications(): NotifJson[] {
  try {
    if (!existsSync(NOTIFICATIONS_FILE)) return [];
    return JSON.parse(readFileSync(NOTIFICATIONS_FILE, "utf-8")) as NotifJson[];
  } catch { return []; }
}
function saveNotifications(n: NotifJson[]): void {
  writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(n, null, 2), "utf-8");
}
function readUserNotifications(): Record<string, NotifJson[]> {
  try {
    if (!existsSync(USER_NOTIFICATIONS_FILE)) return {};
    return JSON.parse(readFileSync(USER_NOTIFICATIONS_FILE, "utf-8")) as Record<string, NotifJson[]>;
  } catch { return {}; }
}
function saveUserNotifications(data: Record<string, NotifJson[]>): void {
  writeFileSync(USER_NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ── Notification read/write endpoints ────────────────────────────────────────

// GET /api/notifications — DB-backed, falls back to JSON
router.get("/notifications", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(notificationLogTable)
      .where(eq(notificationLogTable.recipientType, "all"))
      .orderBy(desc(notificationLogTable.createdAt))
      .limit(50);
    if (rows.length > 0) {
      res.json(rows.map(r => ({
        id: r.notifId,
        title: r.title,
        body: r.body,
        type: r.type,
        icon: r.icon,
        sender: r.userId ?? undefined,
        recipient: "all",
        createdAt: r.createdAt.toISOString(),
      })));
      return;
    }
  } catch { /* fallthrough to JSON */ }
  res.json(readNotifications().slice(-50).reverse());
});

// POST /api/notifications — admin only
router.post("/notifications", async (req, res): Promise<void> => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }

  const { title, body, type = "info", icon = "bell", sender } = req.body as NotifJson;
  if (!title || !body) { res.status(400).json({ error: "title and body are required" }); return; }

  const dedupHash = makeNotifDedup(title, body, "all");
  if (await isDuplicate(dedupHash)) {
    res.status(409).json({ error: "Duplicate notification — identical message sent within the last 60 seconds" });
    return;
  }

  const notifId = Date.now();
  const newNotification: NotifJson = {
    id: notifId, title, body,
    type: type as NotifJson["type"], icon,
    ...(sender ? { sender } : {}),
    recipient: "all",
    createdAt: new Date().toISOString(),
  };

  // Write to DB FIRST (primary store) — then JSON mirror
  const logId = await logNotification({
    notifId, title, body, type: newNotification.type, icon,
    recipientType: "all", actionUrl: "/app/home",
  });
  // JSON mirror (legacy compat)
  const notifications = readNotifications();
  notifications.push(newNotification);
  saveNotifications(notifications);

  req.log.info({ id: notifId }, "Notification created");
  broadcastSSE("notification", newNotification);
  res.json(newNotification);

  // Send push; update log status based on actual delivery counts
  const result = await sendPushToAll(title, body, "/app/home", notifId, newNotification.type)
    .catch(() => ({ sent: 0, failed: 0 }));
  if (logId !== null) void updateNotifLogStatus(logId, result.sent > 0 ? "sent" : "failed");
});

// GET /api/notifications/user — DB-backed, falls back to JSON
router.get("/notifications/user", async (req, res): Promise<void> => {
  const walletId = req.query.walletId as string;
  if (!walletId) { res.status(400).json({ error: "walletId required" }); return; }
  try {
    const rows = await db
      .select()
      .from(notificationLogTable)
      .where(eq(notificationLogTable.targetUserId, walletId))
      .orderBy(desc(notificationLogTable.createdAt))
      .limit(50);
    if (rows.length > 0) {
      res.json(rows.map(r => ({
        id: r.notifId,
        title: r.title,
        body: r.body,
        type: r.type,
        icon: r.icon,
        sender: r.userId ?? undefined,
        recipient: "specific",
        targetWalletId: r.targetUserId ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })));
      return;
    }
  } catch { /* fallthrough to JSON */ }
  res.json((readUserNotifications()[walletId] ?? []).slice(0, 50));
});

// POST /api/notifications/user — admin sends to specific user
router.post("/notifications/user", async (req, res): Promise<void> => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const { walletId, title, body, type = "info", sender, targetName } = req.body as {
    walletId: string; title: string; body: string; type?: string; sender?: string; targetName?: string;
  };
  if (!walletId || !title || !body) {
    res.status(400).json({ error: "walletId, title, body required" }); return;
  }

  const dedupHash = makeNotifDedup(title, body, "user", walletId);
  if (await isDuplicate(dedupHash)) {
    res.status(409).json({ error: "Duplicate notification — identical message sent within the last 60 seconds" });
    return;
  }

  const notifId = Date.now();
  const newMsg: NotifJson = {
    id: notifId, title, body,
    type: type as NotifJson["type"],
    icon: "admin",
    ...(sender ? { sender } : {}),
    recipient: "specific",
    targetWalletId: walletId,
    ...(targetName ? { targetName } : {}),
    createdAt: new Date().toISOString(),
  };

  // Write to DB FIRST (primary store)
  const logId = await logNotification({
    notifId, title, body, type: newMsg.type, icon: "admin",
    recipientType: "user", targetUserId: walletId, actionUrl: "/app/home",
  });
  // JSON mirror
  const all = readUserNotifications();
  if (!all[walletId]) all[walletId] = [];
  all[walletId].unshift(newMsg);
  all[walletId] = all[walletId].slice(0, 30);
  saveUserNotifications(all);

  req.log.info({ walletId, id: notifId }, "User notification sent");
  broadcastSSE("notification", newMsg, walletId);
  res.json(newMsg);

  const result = await sendPushToUser(walletId, title, body, "/app/home", notifId, newMsg.type)
    .catch(() => ({ sent: 0, failed: 0 }));
  if (logId !== null) void updateNotifLogStatus(logId, result.sent > 0 ? "sent" : "failed");
});

// PUT /api/notifications/:id — admin only
router.put("/notifications/:id", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const id = parseInt((req.params as { id: string }).id ?? "0");
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

// DELETE /api/notifications/user/:walletId/all
// Requires auth; walletId must match the authenticated user OR admin token provided.
router.delete("/notifications/user/:walletId/all", requireSupabaseAuth, (req, res): void => {
  const { walletId } = req.params as { walletId: string };
  const userId = req.supabaseUserId!;
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (!walletId) { res.status(400).json({ error: "walletId required" }); return; }
  if (walletId !== userId && (!adminToken || adminToken !== ADMIN_TOKEN)) {
    res.status(403).json({ error: "Forbidden — can only clear your own notifications" }); return;
  }
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

// POST /api/notifications/:id/delivered — unauthenticated (SW background sync)
// Transitions notification_log: sent → delivered, scoped to recipient
router.post("/notifications/:id/delivered", async (req, res): Promise<void> => {
  const id = String((req.params as { id: string }).id ?? "");
  const { walletId } = req.body as { walletId?: string };
  if (!walletId) { res.status(400).json({ error: "walletId required" }); return; }
  const numericId = parseInt(id);
  if (!isNaN(numericId)) {
    void db
      .update(notificationLogTable)
      .set({ status: "delivered" })
      .where(
        and(
          eq(notificationLogTable.notifId, numericId),
          eq(notificationLogTable.status, "sent"),
          // Only affect rows targeting this user OR broadcast rows (no specific recipient)
          or(
            eq(notificationLogTable.targetUserId, walletId),
            isNull(notificationLogTable.targetUserId),
          ),
        ),
      )
      .catch(() => {});
  }
  res.json({ ok: true });
});

// POST /api/notifications/:id/view — authenticated; transitions delivered/sent → read
// Uses auth identity (req.supabaseUserId); body walletId is ignored for security.
router.post("/notifications/:id/view", requireSupabaseAuth, async (req, res): Promise<void> => {
  const id = String((req.params as { id: string }).id ?? "");
  const userId = req.supabaseUserId!;
  const views = readViews();
  if (!views[id]) views[id] = [];
  const already = views[id].some((v: ViewRecord) => v.walletId === userId);
  if (!already) {
    views[id].push({ walletId: userId, viewedAt: new Date().toISOString() });
    saveViews(views);
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      void db
        .update(notificationLogTable)
        .set({ status: "read" })
        .where(
          and(
            eq(notificationLogTable.notifId, numericId),
            // Scope to this user's rows OR broadcast rows
            or(
              eq(notificationLogTable.targetUserId, userId),
              isNull(notificationLogTable.targetUserId),
            ),
          ),
        )
        .catch(() => {});
    }
  }
  res.json({ success: true, count: views[id].length });
});

// GET /api/notifications/:id/viewers — admin only
router.get("/notifications/:id/viewers", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const id = (req.params as { id: string }).id ?? "";
  const list = readViews()[id] ?? [];
  res.json({ id, count: list.length, viewers: list });
});

// DELETE /api/notifications/:id — admin only
router.delete("/notifications/:id", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const id = parseInt((req.params as { id: string }).id ?? "0");
  saveNotifications(readNotifications().filter(n => n.id !== id));
  res.json({ success: true });
});

// ── Live Broadcast ─────────────────────────────────────────────────────────────

interface BroadcastData {
  speed?: 'slow' | 'normal' | 'fast'; text: string; textColor: string;
  countdown?: number; countdownColor?: string; startedAt: string; endsAt?: string;
}
let activeBroadcast: BroadcastData | null = null;

router.get("/broadcast", (_req, res): void => {
  if (!activeBroadcast) { res.json(null); return; }
  if (activeBroadcast.endsAt && new Date(activeBroadcast.endsAt) < new Date()) {
    activeBroadcast = null; res.json(null); return;
  }
  res.json(activeBroadcast);
});

router.post("/broadcast", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  const { text, textColor = "#ffffff", countdown, countdownColor = "#ff4444", speed = "normal" } = req.body as {
    text: string; textColor?: string; countdown?: number; countdownColor?: string; speed?: 'slow' | 'normal' | 'fast';
  };
  if (!text?.trim()) { res.status(400).json({ error: "text required" }); return; }
  activeBroadcast = {
    text: text.trim(), textColor, speed, startedAt: new Date().toISOString(),
    ...(countdown && countdown > 0 ? {
      countdown, countdownColor, endsAt: new Date(Date.now() + countdown * 1000).toISOString(),
    } : {}),
  };
  void sendPushToAll("🔴 بث مباشر — LiraPro", text.trim(), "/app/home").catch(() => {});
  broadcastSSE("broadcast", activeBroadcast);
  res.json(activeBroadcast);
});

router.delete("/broadcast", (req, res): void => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) { res.status(403).json({ error: "Unauthorized" }); return; }
  activeBroadcast = null;
  broadcastSSE("broadcast_end", {});
  res.json({ success: true });
});

export default router;
