import { Router } from "express";
import { requireSupabaseAuth } from "../middlewares/requireSupabaseAuth.js";
import {
  getUserSessions,
  deleteSession,
  deleteAllOtherSessions,
  makeSessionId,
} from "../services/sessionService.js";

const router = Router();

// GET /api/sessions — return all sessions for the current user
// Uses X-Device-Id when available for accurate isCurrent computation
router.get("/sessions", requireSupabaseAuth, async (req, res): Promise<void> => {
  const userId = req.supabaseUserId!;
  const ua = (req.headers["user-agent"] as string | undefined) ?? "";
  const deviceId = req.headers["x-device-id"] as string | undefined;
  const currentId = makeSessionId(userId, deviceId ?? ua);
  const sessions = await getUserSessions(userId);
  res.json(
    sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentId,
    })),
  );
});

// PUT /api/sessions/heartbeat — keeps lastSeenAt fresh every 5 minutes
// requireSupabaseAuth middleware already calls trackSession(userId, ip, ua, deviceId)
// so no additional trackSession call is needed here.
router.put("/sessions/heartbeat", requireSupabaseAuth, (_req, res): void => {
  res.json({ ok: true });
});

// DELETE /api/sessions/:sessionId — revoke a specific session
router.delete("/sessions/:sessionId", requireSupabaseAuth, async (req, res): Promise<void> => {
  const userId = req.supabaseUserId!;
  const { sessionId } = req.params as { sessionId: string };

  const sessions = await getUserSessions(userId);
  const owns = sessions.some((s) => s.id === sessionId);
  if (!owns) {
    res.status(403).json({ error: "Not your session" });
    return;
  }

  await deleteSession(sessionId);
  res.json({ success: true });
});

// DELETE /api/sessions — revoke all other sessions (keep current)
router.delete("/sessions", requireSupabaseAuth, async (req, res): Promise<void> => {
  const userId = req.supabaseUserId!;
  const ua = (req.headers["user-agent"] as string | undefined) ?? "";
  const deviceId = req.headers["x-device-id"] as string | undefined;
  const currentId = makeSessionId(userId, deviceId ?? ua);
  await deleteAllOtherSessions(userId, currentId);
  res.json({ success: true });
});

export default router;
