import { db } from "@workspace/db";
import { userSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export interface SessionInfo {
  id: string;
  userId: string;
  ip: string;
  userAgent: string;
  deviceName: string;
  deviceType: string;
  lastSeenAt: string;
  createdAt: string;
}

function parseDeviceName(ua: string): string {
  if (!ua) return "جهاز غير معروف";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android Phone" : "Android Tablet";
  if (/Windows/i.test(ua)) {
    if (/Edg\//i.test(ua)) return "Windows — Edge";
    if (/Chrome/i.test(ua)) return "Windows — Chrome";
    if (/Firefox/i.test(ua)) return "Windows — Firefox";
    return "Windows";
  }
  if (/Macintosh|Mac OS/i.test(ua)) {
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return "Mac — Chrome";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Mac — Safari";
    if (/Firefox/i.test(ua)) return "Mac — Firefox";
    return "macOS";
  }
  if (/Linux/i.test(ua)) return "Linux";
  return "متصفح";
}

function parseDeviceType(ua: string): string {
  if (/ipad|tablet|kindle/i.test(ua)) return "tablet";
  if (/iphone|android.*mobile|blackberry|windows phone/i.test(ua)) return "phone";
  return "desktop";
}

/**
 * Derive a stable session ID from userId + fingerprint of the user-agent.
 * One row per (user, browser-family) combination.
 */
export function makeSessionId(userId: string, ua: string): string {
  const key = `${userId}::${ua.slice(0, 80)}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash = hash >>> 0;
  }
  return `sess-${userId.slice(0, 8)}-${hash.toString(16)}`;
}

export async function trackSession(userId: string, ip: string, userAgent: string): Promise<void> {
  try {
    const sessionId = makeSessionId(userId, userAgent);
    await db
      .insert(userSessionsTable)
      .values({
        id: sessionId,
        userId,
        ip: (ip || "").slice(0, 100),
        userAgent: (userAgent || "").slice(0, 400),
        deviceName: parseDeviceName(userAgent),
        deviceType: parseDeviceType(userAgent),
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSessionsTable.id,
        set: {
          ip: (ip || "").slice(0, 100),
          lastSeenAt: new Date(),
        },
      });
  } catch {
    // Non-critical — never throw
  }
}

export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  try {
    const rows = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.userId, userId))
      .orderBy(desc(userSessionsTable.lastSeenAt));
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      ip: r.ip,
      userAgent: r.userAgent,
      deviceName: r.deviceName,
      deviceType: r.deviceType,
      lastSeenAt: r.lastSeenAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    await db.delete(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
    return true;
  } catch {
    return false;
  }
}

export async function deleteAllOtherSessions(userId: string, keepSessionId: string): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.userId, userId));
    await Promise.all(
      rows
        .filter((r) => r.id !== keepSessionId)
        .map((r) => db.delete(userSessionsTable).where(eq(userSessionsTable.id, r.id))),
    );
  } catch {}
}

// Backwards-compat stubs (used nowhere critical but kept for type safety)
export function getUserSession(_userId: string): SessionInfo | null { return null; }
export function getAllSessions(): Record<string, SessionInfo> { return {}; }
