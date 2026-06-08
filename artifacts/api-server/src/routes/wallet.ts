/**
 * POST /api/wallet/event — emit a wallet-type notification for a specific user.
 *
 * Auth (either is accepted):
 *   - Supabase JWT (Authorization: Bearer <token>) — user notifies themselves
 *   - Admin token (X-Admin-Token header) — admin notifies any targetUserId
 *
 * A request carrying a valid admin token does NOT require a user JWT.
 */
import { Router, type Request, type Response } from "express";
import { requireSupabaseAuth } from "../middlewares/requireSupabaseAuth.js";
import { emitNotification } from "../services/notificationService.js";

const router = Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "SYRSYP2026ADMIN";

function isAdminRequest(req: Request): boolean {
  return req.headers["x-admin-token"] === ADMIN_TOKEN;
}

router.post("/wallet/event", async (req: Request, res: Response): Promise<void> => {
  const { targetUserId, title, body, actionUrl } = req.body as {
    targetUserId?: string; title: string; body: string; actionUrl?: string;
  };

  if (!title || !body) {
    res.status(400).json({ error: "title and body required" });
    return;
  }

  let recipientId: string;

  if (isAdminRequest(req)) {
    // Admin path — targetUserId required
    if (!targetUserId) {
      res.status(400).json({ error: "targetUserId required for admin wallet event" });
      return;
    }
    recipientId = targetUserId;
  } else {
    // User JWT path — delegate to requireSupabaseAuth logic inline
    const authHeader = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!authHeader) {
      res.status(401).json({ error: "Authorization header or X-Admin-Token required" });
      return;
    }
    // Run requireSupabaseAuth inline as a one-off verification
    await new Promise<void>((resolve) => {
      requireSupabaseAuth(req, res, () => resolve());
    });
    if (res.headersSent) return; // requireSupabaseAuth rejected the request
    if (!req.supabaseUserId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    // User can only send to themselves (or admin-specified target is ignored)
    recipientId = targetUserId && targetUserId === req.supabaseUserId
      ? targetUserId
      : req.supabaseUserId;
  }

  const result = await emitNotification({
    title,
    body,
    type: "wallet",
    icon: "wallet",
    recipientType: "user",
    targetUserId: recipientId,
    actionUrl: actionUrl ?? "/app/portfolio",
  });

  if (result.deduplicated) {
    res.status(409).json({ error: "Duplicate wallet event within 60 seconds" });
    return;
  }

  res.json({ ok: true, notifId: result.notifId, sent: result.sent });
});

export default router;
