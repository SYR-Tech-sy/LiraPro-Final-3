import { Router, type Request, type Response } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { getAllOverrides, setOverride, deleteOverride, clearAllOverrides } from "../services/rateOverridesService.js";
import { resolveAdminActor } from "../lib/resolveAdminActor.js";
import { incrementVisit, getVisitStats } from "../services/visitService.js";
import { getAllSessions } from "../services/sessionService.js";

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

// ── Visit Tracking (public) ──────────────────────────────────────────────────
router.post("/visit", (_req, res): void => {
  const stats = incrementVisit();
  res.json(stats);
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { data: profiles } = await supabaseAdmin!.from("profiles").select("id, role");
    const { data: bans } = await supabaseAdmin!.from("bans").select("user_id, banned");
    const visits = getVisitStats();

    const allProfiles = profiles ?? [];
    const allBans = bans ?? [];

    res.json({
      totalUsers: allProfiles.length,
      privateUsers: allProfiles.filter(u => u.role === "user").length,
      providers: allProfiles.filter(u => u.role === "vendor").length,
      bannedUsers: allBans.filter(b => b.banned).length,
      totalVisits: visits.total,
      todayVisits: visits.today,
      lastUpdated: new Date().toISOString(),
    });
  } catch (_err) {
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ── Users (admin) ─────────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { data: profiles } = await supabaseAdmin!
      .from("profiles")
      .select("*, bans(*)")
      .order("created_at", { ascending: false });

    const allSessions = await getAllSessions();
    const mapped = (profiles ?? []).map((p: Record<string, unknown>) => {
      const ban = Array.isArray(p.bans) ? p.bans[0] : null;
      const now = new Date();
      const isRestricted = !!(ban?.restricted && ban?.restricted_until && new Date(ban.restricted_until) > now);
      const session = allSessions[p.id as string] ?? null;
      return {
        id: p.id,
        walletId: p.id,
        supabaseId: p.id,
        email: p.email,
        fullName: [p.first_name, p.last_name].filter(Boolean).join(" ") || undefined,
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        fatherName: p.father_name ?? null,
        phone: p.phone ?? null,
        // province = governorate (UI uses "province" field name)
        province: p.governorate ?? null,
        governorate: p.governorate ?? null,
        city: p.city ?? null,
        address: p.address ?? null,
        gender: p.gender ?? null,
        dob: p.birth_date ?? null,
        role: p.role ?? "user",
        accountType: p.account_type ?? "private",
        profileCompleted: p.profile_completed ?? false,
        registeredAt: p.created_at,
        lastSeen: p.updated_at ?? null,
        banned: ban?.banned ?? false,
        banReason: ban?.ban_reason ?? null,
        bannedAt: ban?.banned_at ?? null,
        restricted: isRestricted,
        restrictedUntil: isRestricted ? ban?.restricted_until : null,
        restrictReason: isRestricted ? ban?.restrict_reason : null,
        softDeleted: ban?.soft_deleted ?? false,
        profilePhoto: (p.avatar_url ?? null) as string | null,
        lastIp: session?.ip ?? null,
        lastDevice: session?.deviceName ?? null,
        lastSeenVia: session?.lastSeenAt ?? null,
      };
    });

    res.json(mapped);
  } catch {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ── Update user profile (admin) ───────────────────────────────────────────────
router.patch("/admin/users/:userId", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { userId } = req.params;
  const body = req.body as Record<string, string | undefined>;

  // Accept both camelCase (from UI) and snake_case
  const updates: Record<string, unknown> = {};

  const firstName  = body.firstName  ?? (body.fullName ? body.fullName.split(" ")[0] : undefined);
  const lastName   = body.lastName   ?? (body.fullName ? body.fullName.split(" ").slice(1).join(" ") : undefined);

  if (body.fullName !== undefined) {
    const parts = body.fullName.trim().split(/\s+/);
    updates.first_name = parts[0] ?? null;
    updates.last_name  = parts.slice(1).join(" ") || null;
  }
  if (firstName  !== undefined) updates.first_name  = firstName || null;
  if (lastName   !== undefined) updates.last_name   = lastName  || null;
  if (body.fatherName !== undefined) updates.father_name  = body.fatherName  || null;
  if (body.phone      !== undefined) updates.phone         = body.phone       || null;
  if (body.email      !== undefined) updates.email         = body.email       || null;
  if (body.gender     !== undefined) updates.gender        = body.gender      || null;
  if (body.dob        !== undefined) updates.birth_date    = body.dob         || null;
  if (body.province   !== undefined) updates.governorate   = body.province    || null;
  if (body.governorate!== undefined) updates.governorate   = body.governorate || null;
  if (body.city       !== undefined) updates.city          = body.city        || null;
  if (body.address    !== undefined) updates.address       = body.address     || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin!
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    res.status(500).json({ error: "Failed to update user", detail: error.message });
    return;
  }

  res.json({ success: true });
});

// ── Ban / Unban / Restrict ───────────────────────────────────────────────────
router.post("/admin/users/:userId/ban", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { reason } = req.body as { reason?: string };
  await supabaseAdmin!.from("bans").upsert({
    user_id: req.params.userId,
    banned: true,
    ban_reason: reason ?? "",
    banned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  res.json({ success: true });
});

router.post("/admin/users/:userId/unban", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const userId = req.params.userId;
    await supabaseAdmin!.from("bans").upsert(
      { user_id: userId, banned: false, ban_reason: "", updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to unban user" });
  }
});

router.post("/admin/users/:userId/restrict", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { reason, days } = req.body as { reason?: string; days?: number };
  const until = new Date();
  until.setDate(until.getDate() + (days ?? 7));
  await supabaseAdmin!.from("bans").upsert({
    user_id: req.params.userId,
    restricted: true,
    restrict_reason: reason ?? "",
    restricted_until: until.toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  res.json({ success: true });
});

router.post("/admin/users/:userId/unrestrict", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  await supabaseAdmin!.from("bans").upsert({
    user_id: req.params.userId,
    restricted: false,
    restrict_reason: null,
    restricted_until: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  res.json({ success: true });
});

router.post("/admin/users/:userId/soft-delete", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { reason } = req.body as { reason?: string };
  await supabaseAdmin!.from("bans").upsert({
    user_id: req.params.userId,
    soft_deleted: true,
    delete_reason: reason ?? "",
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  res.json({ success: true });
});

router.post("/admin/users/:userId/undelete", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  await supabaseAdmin!.from("bans").upsert({
    user_id: req.params.userId,
    soft_deleted: false,
    delete_reason: null,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  res.json({ success: true });
});

// ── Public ban-status check ──────────────────────────────────────────────────
router.get("/users/ban-status/:userId", async (req, res): Promise<void> => {
  try {
    const { data } = await supabaseAdmin!
      .from("bans")
      .select("*")
      .eq("user_id", req.params.userId)
      .single();

    if (!data) {
      res.json({ banned: false, restricted: false, softDeleted: false });
      return;
    }

    const now = new Date();
    const isRestricted = !!(data.restricted && data.restricted_until && new Date(data.restricted_until) > now);

    res.json({
      banned: data.banned ?? false,
      banReason: data.ban_reason ?? null,
      bannedAt: data.banned_at ?? null,
      restricted: isRestricted,
      restrictedUntil: isRestricted ? data.restricted_until : null,
      restrictReason: isRestricted ? data.restrict_reason : null,
      softDeleted: data.soft_deleted ?? false,
      deletedAt: data.deleted_at ?? null,
      deleteReason: data.delete_reason ?? null,
    });
  } catch {
    res.json({ banned: false, restricted: false, softDeleted: false });
  }
});

// ── Rate Overrides ───────────────────────────────────────────────────────────
router.get("/admin/rate-overrides", async (_req, res): Promise<void> => {
  res.json(await getAllOverrides());
});

router.post("/admin/rate-overrides", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const { code, buyPrice, sellPrice } = req.body as { code: string; buyPrice?: number; sellPrice?: number };
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  const actor = await resolveAdminActor(req);
  const entry = await setOverride(code, buyPrice, sellPrice, actor);
  res.json(entry);
});

router.delete("/admin/rate-overrides/:code", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const actor = await resolveAdminActor(req);
  const ok = await deleteOverride(req.params.code, actor);
  res.json({ success: ok });
});

router.delete("/admin/rate-overrides", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const actor = await resolveAdminActor(req);
  await clearAllOverrides(actor);
  res.json({ success: true });
});

// ── New events since timestamp (for real-time admin alerts) ──────────────────
router.get("/admin/new-events", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const since = req.query.since as string | undefined;
  const checkedAt = new Date().toISOString();
  if (!since) {
    res.json({ newUsers: 0, newApplications: 0, checkedAt, since: checkedAt });
    return;
  }
  try {
    const [usersRes, vendorsRes] = await Promise.allSettled([
      supabaseAdmin!.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", since),
      supabaseAdmin!.from("vendors").select("*", { count: "exact", head: true }).gt("created_at", since),
    ]);
    const newUsers = usersRes.status === "fulfilled" ? (usersRes.value.count ?? 0) : 0;
    const newApplications = vendorsRes.status === "fulfilled" ? (vendorsRes.value.count ?? 0) : 0;
    res.json({ newUsers, newApplications, checkedAt, since });
  } catch {
    res.json({ newUsers: 0, newApplications: 0, checkedAt, since });
  }
});
// ── Ban Attempt Tracking ───────────────────────────────────────────────────────
const BAN_ATTEMPTS_FILE = join(dirname(fileURLToPath(import.meta.url)), "../ban-attempts.json");

function readBanAttempts(): unknown[] {
  try {
    if (!existsSync(BAN_ATTEMPTS_FILE)) return [];
    return JSON.parse(readFileSync(BAN_ATTEMPTS_FILE, "utf-8")) as unknown[];
  } catch { return []; }
}
function saveBanAttempts(data: unknown[]): void {
  try { writeFileSync(BAN_ATTEMPTS_FILE, JSON.stringify(data, null, 2), "utf-8"); } catch { /**/ }
}

router.post("/admin/ban-attempt", async (req, res): Promise<void> => {
  try {
    const { userId, email, userAgent, reason, bannedAt } = req.body as {
      userId?: string; email?: string; userAgent?: string; reason?: string; bannedAt?: string;
    };
    const attempt = {
      id: Date.now(),
      userId: userId ?? "unknown",
      email: email ?? "unknown",
      userAgent: userAgent ?? "",
      reason: reason ?? "",
      bannedAt: bannedAt ?? null,
      attemptedAt: new Date().toISOString(),
      ip: req.ip ?? req.socket?.remoteAddress ?? "unknown",
    };
    const all = readBanAttempts();
    all.push(attempt);
    saveBanAttempts(all.slice(-500));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to record ban attempt" });
  }
});

router.get("/admin/ban-attempts", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const all = readBanAttempts() as Array<Record<string, unknown>>;
  res.json(all.slice(-100).reverse());
});

export default router;
