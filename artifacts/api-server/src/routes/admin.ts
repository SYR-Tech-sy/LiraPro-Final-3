import { Router, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getAllUsers, upsertUser, deleteUser, banUser, unbanUser, restrictUser, unrestrictUser, softDeleteUser, undeleteUser, updateUser, getActiveUsers } from "../services/usersService.js";
import { getAllRequests, addRequest, markHandled, cancelRequestByWallet, deleteRequestById } from "../services/deletionService.js";
import { getAllOverrides, setOverride, deleteOverride, clearAllOverrides } from "../services/rateOverridesService.js";
import { incrementVisit, getVisitStats } from "../services/visitService.js";
import { getOverrideHistory } from "../services/overrideHistoryService.js";

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

// ── Visit Tracking (public) ─────────────────────────────────────────────────

router.post("/visit", (_req, res): void => {
  const stats = incrementVisit();
  res.json(stats);
});

// ── Admin Stats ─────────────────────────────────────────────────────────────

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const dbUsers = await db.select().from(usersTable);
    const requests = getAllRequests();
    const visits = getVisitStats();
    const activeUsers = getActiveUsers(60);
    res.json({
      totalUsers: dbUsers.length,
      privateUsers: dbUsers.filter(u => u.role === "user").length,
      providers: dbUsers.filter(u => u.role === "vendor").length,
      bannedUsers: getAllUsers().filter(u => u.banned).length,
      activeUsers: activeUsers.length,
      pendingRequests: requests.filter(r => r.status === "pending").length,
      handledRequests: requests.filter(r => r.status === "handled").length,
      totalVisits: visits.total,
      todayVisits: visits.today,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    const users = getAllUsers();
    const requests = getAllRequests();
    const visits = getVisitStats();
    const activeUsers = getActiveUsers(60);
    res.json({
      totalUsers: users.length,
      privateUsers: users.filter(u => u.accountType === "private" && !u.banned).length,
      providers: users.filter(u => u.accountType === "provider" && !u.banned).length,
      bannedUsers: users.filter(u => u.banned).length,
      activeUsers: activeUsers.length,
      pendingRequests: requests.filter(r => r.status === "pending").length,
      handledRequests: requests.filter(r => r.status === "handled").length,
      totalVisits: visits.total,
      todayVisits: visits.today,
      lastUpdated: new Date().toISOString(),
    });
  }
});

// ── Users ───────────────────────────────────────────────────────────────────

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const dbUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    const jsonUsers = getAllUsers();
    const jsonBySupabaseId = new Map(jsonUsers.filter(u => u.supabaseId).map(u => [u.supabaseId!, u]));
    const mapped = dbUsers.map(u => {
      const jsonUser = jsonBySupabaseId.get(u.supabaseId);
      return {
        id: u.supabaseId,
        walletId: u.supabaseId,
        supabaseId: u.supabaseId,
        accountType: (u.role === "vendor" ? "provider" : "private") as "private" | "provider",
        fullName: [u.firstName, u.lastName].filter(Boolean).join(" ") || undefined,
        fatherName: u.fatherName ?? undefined,
        email: u.email,
        phone: u.phone ?? undefined,
        dob: u.birthDate ?? undefined,
        gender: u.gender ?? undefined,
        province: u.governorate ?? undefined,
        city: u.city ?? undefined,
        address: u.address ?? undefined,
        registeredAt: u.createdAt.toISOString(),
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
        loginProvider: u.loginProvider ?? 'email',
        role: u.role,
        profileCompleted: u.profileCompleted,
        latitude: u.latitude ?? undefined,
        longitude: u.longitude ?? undefined,
        banned: jsonUser?.banned ?? false,
        banReason: jsonUser?.banReason ?? undefined,
        bannedAt: jsonUser?.bannedAt ?? undefined,
        restricted: jsonUser?.restricted ?? false,
        restrictedUntil: jsonUser?.restrictedUntil ?? undefined,
        restrictReason: jsonUser?.restrictReason ?? undefined,
        softDeleted: jsonUser?.softDeleted ?? false,
        lastSeen: jsonUser?.lastSeen ?? undefined,
      };
    });
    // Also include legacy JSON users not in DB
    const dbIds = new Set(dbUsers.map(u => u.supabaseId));
    const legacyOnly = jsonUsers.filter(u => !u.supabaseId || !dbIds.has(u.supabaseId));
    res.json([...mapped, ...legacyOnly]);
  } catch {
    res.json(getAllUsers());
  }
});

router.post("/admin/users", (req, res): void => {
  const body = req.body as Parameters<typeof upsertUser>[0];
  const user = upsertUser(body);
  res.json(user);
});

router.patch("/admin/users/:walletId", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const updated = updateUser(req.params.walletId, req.body as Parameters<typeof updateUser>[1]);
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

router.delete("/admin/users/:walletId", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const walletId = req.params.walletId!;
  deleteUser(walletId);
  try { await db.delete(usersTable).where(eq(usersTable.supabaseId, walletId)); } catch {}
  // Also delete from Supabase auth via service key if available
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_KEY ?? ""
    );
    await supabaseAdmin.auth.admin.deleteUser(walletId);
  } catch {}
  res.json({ success: true });
});

router.post("/admin/users/:walletId/ban", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const { reason } = req.body as { reason?: string };
  const ok = banUser(req.params.walletId, reason ?? "");
  res.json({ success: ok });
});

router.post("/admin/users/:walletId/unban", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const ok = unbanUser(req.params.walletId);
  res.json({ success: ok });
});

router.post("/admin/users/:walletId/restrict", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const { reason, days } = req.body as { reason?: string; days?: number };
  const ok = restrictUser(req.params.walletId, reason ?? "", days ?? 7);
  res.json({ success: ok });
});

router.post("/admin/users/:walletId/unrestrict", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const ok = unrestrictUser(req.params.walletId);
  res.json({ success: ok });
});

router.post("/admin/users/:walletId/soft-delete", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const { reason } = req.body as { reason?: string };
  const ok = softDeleteUser(req.params.walletId, reason ?? "");
  res.json({ success: ok });
});

router.post("/admin/users/:walletId/undelete", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const ok = undeleteUser(req.params.walletId);
  res.json({ success: ok });
});

// ── Public account-status check (no admin token required) ────────────────────
router.get("/users/ban-status/:walletId", (req, res): void => {
  const users = getAllUsers();
  const user = users.find(u => u.walletId === req.params.walletId || u.supabaseId === req.params.walletId);
  if (!user) {
    res.json({ banned: false, restricted: false, softDeleted: false });
    return;
  }
  const now = new Date();
  const isRestricted = !!(user.restricted && user.restrictedUntil && new Date(user.restrictedUntil) > now);
  res.json({
    banned: user.banned ?? false,
    banReason: user.banReason ?? null,
    bannedAt: user.bannedAt ?? null,
    restricted: isRestricted,
    restrictedUntil: isRestricted ? (user.restrictedUntil ?? null) : null,
    restrictReason: isRestricted ? (user.restrictReason ?? null) : null,
    softDeleted: user.softDeleted ?? false,
    deletedAt: user.deletedAt ?? null,
    deleteReason: user.deleteReason ?? null,
  });
});

// ── Deletion Requests ───────────────────────────────────────────────────────

router.get("/admin/deletion-requests", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  res.json(getAllRequests());
});

router.post("/admin/deletion-requests", (req, res): void => {
  const body = req.body as Parameters<typeof addRequest>[0];
  const r = addRequest(body);
  res.json(r);
});

router.patch("/admin/deletion-requests/:id", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const { status } = req.body as { status?: "handled" | "rejected" };
  const ok = markHandled(req.params.id, status ?? "handled");
  res.json({ success: ok });
});

router.delete("/admin/deletion-requests/cancel/:walletId", (req, res): void => {
  const ok = cancelRequestByWallet(req.params.walletId);
  res.json({ success: ok });
});

router.delete("/admin/deletion-requests/:id", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const ok = deleteRequestById(req.params.id);
  res.json({ success: ok });
});

// ── Rate Overrides ──────────────────────────────────────────────────────────

router.get("/admin/rate-overrides", (_req, res): void => {
  res.json(getAllOverrides());
});

router.post("/admin/rate-overrides", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const { code, buyPrice, sellPrice } = req.body as { code: string; buyPrice?: number; sellPrice?: number };
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  const entry = setOverride(code, buyPrice, sellPrice, "admin");
  res.json(entry);
});

router.delete("/admin/rate-overrides/:code", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  const ok = deleteOverride(req.params.code, "admin");
  res.json({ success: ok });
});

router.delete("/admin/rate-overrides", (req, res): void => {
  if (!verifyAdmin(req, res)) return;
  clearAllOverrides("admin");
  res.json({ success: true });
});

// ── Override History ─────────────────────────────────────────────────────────

router.get("/admin/override-history", async (req, res): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
    const history = await getOverrideHistory(limit);
    res.json(history);
  } catch {
    res.status(500).json({ error: "Failed to fetch override history" });
  }
});

export default router;
