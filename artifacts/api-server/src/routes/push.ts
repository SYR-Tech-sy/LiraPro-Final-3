import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireSupabaseAuth } from "../middlewares/requireSupabaseAuth.js";

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ??
  "BJzyEc9S5BL2HQtaPDL0IzsaKrj9hsy2XoaS7VlVb47osz07-tZE-o-9hgtii2sVBMlYeKN0CHl9sPaxuYRptdc";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ??
  "HRgfhQngmEKy8v3iZxsBPxk9Lt5AMttrg-X5fqRpeyc";

webpush.setVapidDetails("mailto:admin@lirapro.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface SubBody {
  endpoint: string;
  keys: { auth: string; p256dh: string };
}

/** Only remove a subscription on permanent expiry (410 Gone / 404 Not Found). */
function isPermanentPushError(err: unknown): boolean {
  const status = (err as { statusCode?: number })?.statusCode;
  return status === 404 || status === 410;
}

// GET /api/push/vapid-public-key
router.get("/push/vapid-public-key", (_req, res): void => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — authenticated, stores per-user subscription in DB
router.post("/push/subscribe", requireSupabaseAuth, async (req, res): Promise<void> => {
  const sub = req.body as SubBody;
  if (!sub?.endpoint || !sub?.keys?.auth || !sub?.keys?.p256dh) {
    res.status(400).json({ error: "Invalid subscription" });
    return;
  }
  const userId = req.supabaseUserId!;
  const ua = (req.headers["user-agent"] ?? "").slice(0, 400);

  try {
    await db
      .insert(pushSubscriptionsTable)
      .values({
        id: randomUUID(),
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: ua,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          userId,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          userAgent: ua,
          lastUsedAt: new Date(),
        },
      });

    const rows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));

    res.json({ success: true, count: rows.length });
  } catch (err) {
    req.log.error(err, "push/subscribe DB error");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/subscribe — authenticated; scoped to the requesting user only
router.delete("/push/subscribe", requireSupabaseAuth, async (req, res): Promise<void> => {
  const userId = req.supabaseUserId!;
  const { endpoint } = req.body as { endpoint?: string };
  if (endpoint) {
    try {
      await db
        .delete(pushSubscriptionsTable)
        .where(
          and(
            eq(pushSubscriptionsTable.endpoint, endpoint),
            eq(pushSubscriptionsTable.userId, userId),
          ),
        );
    } catch (err) {
      req.log.error(err, "push/unsubscribe DB error");
    }
  }
  res.json({ success: true });
});

// GET /api/push/subscribers-count — admin only
router.get("/push/subscribers-count", async (req, res): Promise<void> => {
  const token = req.headers["x-admin-token"] as string;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db.select().from(pushSubscriptionsTable);
    res.json({ count: rows.length });
  } catch {
    res.json({ count: 0 });
  }
});

export async function sendPushToAll(
  title: string,
  body: string,
  url = "/app/home",
  notifId?: number,
): Promise<void> {
  let subs: typeof pushSubscriptionsTable.$inferSelect[];
  try {
    subs = await db.select().from(pushSubscriptionsTable);
  } catch {
    return;
  }
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url, ...(notifId ? { notifId } : {}) });
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } } as webpush.PushSubscription,
          payload,
        );
        await db
          .update(pushSubscriptionsTable)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
      } catch (err) {
        if (isPermanentPushError(err)) expiredEndpoints.push(sub.endpoint);
        // Transient errors → keep subscription
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    await Promise.all(
      expiredEndpoints.map((endpoint) =>
        db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint)),
      ),
    ).catch(() => {});
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/app/home",
  notifId?: number,
): Promise<void> {
  let subs: typeof pushSubscriptionsTable.$inferSelect[];
  try {
    subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
  } catch {
    return;
  }
  if (subs.length === 0) return;

  // Include walletId so the SW can enqueue a read receipt
  const payload = JSON.stringify({
    title,
    body,
    url,
    walletId: userId,
    ...(notifId ? { notifId } : {}),
  });
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } } as webpush.PushSubscription,
          payload,
        );
        await db
          .update(pushSubscriptionsTable)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
      } catch (err) {
        if (isPermanentPushError(err)) expiredEndpoints.push(sub.endpoint);
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    await Promise.all(
      expiredEndpoints.map((endpoint) =>
        db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint)),
      ),
    ).catch(() => {});
  }
}

export default router;
