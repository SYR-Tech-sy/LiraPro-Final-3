import { Router, type Request, type Response } from "express";
import { requireSupabaseAuth } from "../middlewares/requireSupabaseAuth.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { db, usersTable, vendorProfilesTable, type VendorCategory } from "@workspace/db";
import { eq } from "drizzle-orm";
import { addRequest, getAllRequests, markHandled, cancelRequestByWallet, deleteRequestById } from "../services/deletionService.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __vendorsDir = dirname(fileURLToPath(import.meta.url));
const USER_NOTIF_FILE = join(__vendorsDir, "../user-notifications.json");

function readUserNotifs(): Record<string, unknown[]> {
  try {
    if (!existsSync(USER_NOTIF_FILE)) return {};
    return JSON.parse(readFileSync(USER_NOTIF_FILE, "utf-8")) as Record<string, unknown[]>;
  } catch { return {}; }
}

function saveUserNotifs(data: Record<string, unknown[]>): void {
  try { writeFileSync(USER_NOTIF_FILE, JSON.stringify(data, null, 2), "utf-8"); } catch {}
}

const router = Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "SYRSYP2026ADMIN";

function verifyAdmin(req: Request, res: Response): boolean {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── List all vendors ──────────────────────────────────────────────────────────
router.get("/admin/vendors", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { data, error } = await supabaseAdmin!
      .from("vendors")
      .select("*, profiles(email, first_name, last_name, phone, governorate, city)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Failed to load vendors" });
  }
});

// ── Create vendor ─────────────────────────────────────────────────────────────
router.post("/admin/vendors", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const body = req.body as {
    user_id?: string;
    business_name: string;
    owner_name?: string;
    phone?: string;
    email?: string;
    governorate?: string;
    city?: string;
    address?: string;
    category_ids?: string[];
    trust_score?: number;
    is_golden?: boolean;
    badge_type?: string;
  };
  if (!body.business_name) {
    res.status(400).json({ error: "business_name is required" });
    return;
  }
  try {
    const { data, error } = await supabaseAdmin!
      .from("vendors")
      .insert({
        user_id: body.user_id ?? null,
        business_name: body.business_name,
        owner_name: body.owner_name ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        governorate: body.governorate ?? null,
        city: body.city ?? null,
        address: body.address ?? null,
        category_ids: body.category_ids ?? [],
        trust_score: body.trust_score ?? 5,
        is_golden: body.is_golden ?? false,
        badge_type: body.badge_type ?? "none",
        is_active: true,
        verified: false,
      })
      .select()
      .single();
    if (error) throw error;

    // If user_id given, upgrade their role to vendor in both tables
    if (body.user_id) {
      await supabaseAdmin!
        .from("profiles")
        .update({ role: "vendor", updated_at: new Date().toISOString() })
        .eq("id", body.user_id);
      const existing = await db.select({ id: usersTable.supabaseId }).from(usersTable).where(eq(usersTable.supabaseId, body.user_id)).limit(1);
      if (existing.length > 0) {
        await db.update(usersTable).set({ role: "vendor", updatedAt: new Date() }).where(eq(usersTable.supabaseId, body.user_id));
      } else {
        await db.insert(usersTable).values({ supabaseId: body.user_id, email: body.email ?? "", role: "vendor", profileCompleted: false }).onConflictDoNothing();
      }

      // Sync to Drizzle vendor_profiles so link-by-email and profile lookups work
      try {
        await db.insert(vendorProfilesTable).values({
          supabaseId: body.user_id,
          businessName: body.business_name,
          fullName: body.owner_name ?? body.business_name,
          email: body.email ?? "",
          phone: body.phone ?? "",
          governorate: body.governorate ?? "",
          city: body.city ?? "",
          address: body.address ?? "",
          category: (body.category_ids?.[0] ?? "local_market") as VendorCategory,
        }).onConflictDoUpdate({
          target: vendorProfilesTable.supabaseId,
          set: {
            businessName: body.business_name,
            fullName: body.owner_name ?? body.business_name,
            email: body.email ?? "",
            phone: body.phone ?? "",
            governorate: body.governorate ?? "",
            city: body.city ?? "",
            address: body.address ?? "",
            updatedAt: new Date(),
          },
        });
      } catch (syncErr) {
        req.log.warn({ syncErr }, "vendor_profiles sync skipped (non-fatal)");
      }
    }

    // Log admin action
    await supabaseAdmin!.from("admin_logs").insert({
      action: "vendor_created",
      target_type: "vendor",
      target_id: String(data?.id),
      details: `Created vendor: ${body.business_name}`,
    });

    req.log.info({ vendor_id: data?.id }, "Vendor created via Supabase");
    res.status(201).json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to create vendor");
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

// ── Update vendor ─────────────────────────────────────────────────────────────
router.patch("/admin/vendors/:id", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const body = req.body as Record<string, unknown>;
  try {
    const { data, error } = await supabaseAdmin!
      .from("vendors")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

// ── Delete vendor ─────────────────────────────────────────────────────────────
router.delete("/admin/vendors/:id", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    // Get vendor first to revert user role
    const { data: vendor } = await supabaseAdmin!
      .from("vendors")
      .select("user_id, business_name")
      .eq("id", req.params.id)
      .single();

    await supabaseAdmin!.from("vendors").delete().eq("id", req.params.id);

    if (vendor?.user_id) {
      await supabaseAdmin!
        .from("profiles")
        .update({ role: "user", updated_at: new Date().toISOString() })
        .eq("id", vendor.user_id);
    }

    await supabaseAdmin!.from("admin_logs").insert({
      action: "vendor_deleted",
      target_type: "vendor",
      target_id: req.params.id,
      details: `Deleted vendor: ${vendor?.business_name ?? req.params.id}`,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// ── Deletion requests ─────────────────────────────────────────────────────────
router.get("/admin/deletion-requests", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { data, error } = await supabaseAdmin!
      .from("delete_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Fetch profiles to get names/emails for each requester
    const userIds = (data ?? [])
      .map((r: Record<string, unknown>) => String(r.user_id ?? ''))
      .filter(Boolean);
    const { data: profiles } = userIds.length > 0
      ? await supabaseAdmin!.from("profiles").select("id, first_name, last_name, email").in("id", userIds)
      : { data: [] };
    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: Record<string, unknown>) => [String(p.id), p])
    );

    const supabaseRows = (data ?? []).map((r: Record<string, unknown>) => {
      const p = profileMap[String(r.user_id ?? '')] as Record<string, unknown> | undefined;
      const firstName = String(p?.first_name ?? '');
      const lastName = String(p?.last_name ?? '');
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
      const st = String(r.status ?? 'pending');
      return {
        id: String(r.id),
        walletId: String(r.user_id ?? ''),
        fullName,
        email: (p?.email as string | undefined) ?? (r.email as string | undefined),
        reason: r.reason as string | undefined,
        status: (st === 'handled' || st === 'approved'
          ? 'handled'
          : st === 'rejected'
          ? 'rejected'
          : 'pending') as 'pending' | 'handled' | 'rejected',
        requestedAt: String(r.created_at ?? new Date().toISOString()),
        handledAt: r.reviewed_at as string | undefined,
      };
    });

    const jsonRows = getAllRequests();
    const supabaseIds = new Set(supabaseRows.map(r => r.walletId));
    const uniqueJson = jsonRows.filter(r => !supabaseIds.has(r.walletId ?? ''));
    res.json([...supabaseRows, ...uniqueJson]);
  } catch {
    res.json(getAllRequests());
  }
});

router.post("/admin/deletion-requests", async (req, res): Promise<void> => {
  const { user_id, reason, walletId, fullName, email, accountType } = req.body as {
    user_id?: string; reason?: string;
    walletId?: string; fullName?: string; email?: string; accountType?: string;
  };
  const userId = user_id ?? walletId ?? '';
  if (!userId) { res.status(400).json({ error: "user_id required" }); return; }
  try {
    const { data, error } = await supabaseAdmin!
      .from("delete_requests")
      .insert({ user_id: userId, reason: reason ?? null, status: "pending" })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch {
    const entry = addRequest({ walletId: userId, fullName, email, accountType, reason });
    res.json(entry);
  }
});

router.patch("/admin/deletion-requests/:id", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { status } = req.body as { status: string };
  try {
    const { data, error } = await supabaseAdmin!
      .from("delete_requests")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch {
    const ok = markHandled(req.params.id ?? '', status === 'rejected' ? 'rejected' : 'handled');
    res.json({ success: ok });
  }
});

// Cancel by user (walletId = user's own Supabase UUID)
router.delete("/admin/deletion-requests/cancel/:walletId", async (req, res): Promise<void> => {
  try {
    await supabaseAdmin!
      .from("delete_requests")
      .delete()
      .eq("user_id", req.params.walletId)
      .eq("status", "pending");
    cancelRequestByWallet(req.params.walletId);
    res.json({ success: true });
  } catch {
    cancelRequestByWallet(req.params.walletId);
    res.json({ success: true });
  }
});

// Admin hard-delete a single request
router.delete("/admin/deletion-requests/:id", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    await supabaseAdmin!.from("delete_requests").delete().eq("id", req.params.id);
    deleteRequestById(req.params.id);
    res.json({ success: true });
  } catch {
    const ok = deleteRequestById(req.params.id);
    res.json({ success: ok });
  }
});

// ── Broadcast notification to all users (via Supabase) ───────────────────────
router.post("/admin/notifications/broadcast", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { title, body, type = "info" } = req.body as { title: string; body: string; type?: string };
  if (!title || !body) { res.status(400).json({ error: "title and body required" }); return; }
  try {
    // Get all user IDs
    const { data: profiles } = await supabaseAdmin!
      .from("profiles")
      .select("id")
      .neq("role", "admin");

    const notifications = (profiles ?? []).map(p => ({
      user_id: p.id as string,
      title,
      body,
      type,
      read: false,
    }));

    if (notifications.length > 0) {
      await supabaseAdmin!.from("notifications").insert(notifications);
    }

    req.log.info({ count: notifications.length }, "Broadcast notification sent");
    res.json({ success: true, sent: notifications.length });
  } catch (err) {
    req.log.error({ err }, "Failed to broadcast notification");
    res.status(500).json({ error: "Failed to broadcast" });
  }
});

// ── Send notification to specific user ───────────────────────────────────────
router.post("/notifications/user", async (req, res): Promise<void> => {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { user_id, walletId, title, body, type = "admin_message", sender, targetName } = req.body as {
    user_id?: string; walletId?: string; title: string; body: string;
    type?: string; sender?: string; targetName?: string;
  };
  const targetId = user_id ?? walletId;
  if (!targetId || !title || !body) {
    res.status(400).json({ error: "user_id/walletId, title, body required" });
    return;
  }
  try {
    // 1. ALWAYS write to local JSON first (guaranteed delivery — notifications panel reads this)
    const all = readUserNotifs();
    if (!all[targetId]) all[targetId] = [];
    const localEntry = {
      id: Date.now(),
      title,
      body,
      type,
      icon: "admin",
      ...(sender ? { sender } : {}),
      recipient: "specific",
      targetWalletId: targetId,
      ...(targetName ? { targetName } : {}),
      createdAt: new Date().toISOString(),
    };
    all[targetId] = [localEntry, ...all[targetId]].slice(0, 30);
    saveUserNotifs(all);

    // 2. Also try to write to Supabase (for /api/user-messages — non-blocking, failure OK)
    let respData: unknown = { id: localEntry.id, title, body, type, user_id: targetId, read: false };
    try {
      const { data } = await supabaseAdmin!
        .from("notifications")
        .insert({ user_id: targetId, title, body, type, read: false })
        .select()
        .single();
      if (data) respData = data;
    } catch {
      console.warn("[notify] Supabase insert failed — local JSON delivery succeeded");
    }

    res.json(respData);
  } catch {
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// ── Admin logs ────────────────────────────────────────────────────────────────
router.get("/admin/logs", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { data } = await supabaseAdmin!
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Failed to load logs" });
  }
});

// ── Admin messaging — GET all sent admin messages ─────────────────────────────
router.get("/admin/messages", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { data } = await supabaseAdmin!
      .from("notifications")
      .select("*")
      .eq("type", "admin_message")
      .order("created_at", { ascending: false })
      .limit(200);
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

// ── User inbox — fetch own messages (auth via Bearer token) ───────────────────
router.get("/user-messages", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabaseAdmin!.auth.getUser(token);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { data } = await supabaseAdmin!
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "admin_message")
      .order("created_at", { ascending: false });
    res.json(data ?? []);
  } catch {
    res.json([]);
  }
});

// ── Mark message as read ──────────────────────────────────────────────────────
router.patch("/user-messages/:id/read", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabaseAdmin!.auth.getUser(token);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    await supabaseAdmin!
      .from("notifications")
      .update({ read: true })
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ── User notifications from local JSON (fallback when Supabase write fails) ───
router.get("/user-notifications", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabaseAdmin!.auth.getUser(token);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    const all = readUserNotifs();
    const msgs = (all[user.id] ?? []) as Array<Record<string, unknown>>;
    res.json(msgs.map(m => ({
      id: m.id ?? Date.now(),
      title: m.title ?? '',
      body: m.body ?? '',
      type: m.type ?? 'admin_message',
      user_id: user.id,
      read: (m as { read?: boolean }).read ?? false,
      created_at: m.createdAt ?? new Date().toISOString(),
    })));
  } catch {
    res.json([]);
  }
});

// ── Mark local notification as read ──────────────────────────────────────────
router.patch("/user-notifications/:id/read", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabaseAdmin!.auth.getUser(token);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    const all = readUserNotifs();
    const msgs = (all[user.id] ?? []) as Array<Record<string, unknown>>;
    const targetId = Number(req.params.id);
    all[user.id] = msgs.map(m => m.id === targetId ? { ...m, read: true } : m);
    saveUserNotifs(all);
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ── App settings ──────────────────────────────────────────────────────────────
router.get("/admin/app-settings", async (_req, res): Promise<void> => {
  try {
    const { data } = await supabaseAdmin!.from("app_settings").select("*");
    const map: Record<string, string | null> = {};
    (data ?? []).forEach((s: { key: string; value: string | null }) => { map[s.key] = s.value; });
    res.json(map);
  } catch {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.patch("/admin/app-settings", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { key, value } = req.body as { key: string; value: string | null };
  if (!key) { res.status(400).json({ error: "key required" }); return; }
  try {
    await supabaseAdmin!
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// GET /api/user/deletion-request — authenticated user checks their own deletion request status
router.get("/user/deletion-request", requireSupabaseAuth, async (req, res): Promise<void> => {
  const userId = req.supabaseUserId!;
  try {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("delete_requests")
        .select("status, created_at")
        .eq("wallet_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        res.json({ status: data[0].status as string, requestedAt: data[0].created_at as string });
        return;
      }
    }
    // Fallback to local JSON
    const { getAllRequests } = await import("../services/deletionService.js");
    const requests = getAllRequests();
    const found = requests.find(r => r.walletId === userId);
    if (found) {
      res.json({ status: found.status, requestedAt: found.requestedAt });
      return;
    }
    res.json({ status: null });
  } catch {
    res.json({ status: null });
  }
});

export default router;
