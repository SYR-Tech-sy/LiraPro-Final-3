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
  os: string;
  browser: string;
  lastSeenAt: string;
  createdAt: string;
  isCurrent?: boolean;
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

function parseOs(ua: string): string {
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (!ua) return "";
  return "Other";
}

function parseBrowser(ua: string): string {
  if (!ua) return "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "Browser";
}

/**
 * Derive a stable session ID from userId + fingerprint of the provided key.
 * When deviceKey (UUID from localStorage) is used, one row per browser instance.
 * When UA is used as fallback, one row per UA family.
 */
export function makeSessionId(userId: string, key: string): string {
  const raw = `${userId}::${key.slice(0, 80)}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    hash = hash >>> 0;
  }
  return `sess-${userId.slice(0, 8)}-${hash.toString(16)}`;
}

/**
 * Track a session. When `deviceKey` is provided (stable UUID from localStorage)
 * it is used as the session discriminator so each browser instance gets its own row.
 * Falls back to UA fingerprint.
 */
export async function trackSession(
  userId: string,
  ip: string,
  userAgent: string,
  deviceKey?: string,
): Promise<void> {
  try {
    const sessionId = makeSessionId(userId, deviceKey ?? userAgent);
    await db
      .insert(userSessionsTable)
      .values({
        id: sessionId,
        userId,
        ip: (ip || "").slice(0, 100),
        userAgent: (userAgent || "").slice(0, 400),
        deviceName: parseDeviceName(userAgent),
        deviceType: parseDeviceType(userAgent),
        os: parseOs(userAgent),
        browser: parseBrowser(userAgent),
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
    // Non-critical — session tracking should never break request handling
  }
}

export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  try {
    const rows = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.userId, userId))
      .orderBy(desc(userSessionsTable.lastSeenAt))
      .limit(20);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      ip: r.ip,
      userAgent: r.userAgent,
      deviceName: r.deviceName,
      deviceType: r.deviceType,
      os: r.os,
      browser: r.browser,
      lastSeenAt: r.lastSeenAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
}

export async function deleteAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
  const sessions = await getUserSessions(userId);
  const toDelete = sessions.filter((s) => s.id !== currentSessionId);
  await Promise.all(toDelete.map((s) => deleteSession(s.id)));
}

/**
 * Returns the most recent session for each user keyed by userId.
 * Used by the admin panel to display last-seen per user.
 */
export async function getAllSessions(): Promise<Record<string, SessionInfo>> {
  try {
    const rows = await db
      .select()
      .from(userSessionsTable)
      .orderBy(desc(userSessionsTable.lastSeenAt));
    const result: Record<string, SessionInfo> = {};
    for (const r of rows) {
      if (!result[r.userId]) {
        result[r.userId] = {
          id: r.id,
          userId: r.userId,
          ip: r.ip,
          userAgent: r.userAgent,
          deviceName: r.deviceName,
          deviceType: r.deviceType,
          os: r.os,
          browser: r.browser,
          lastSeenAt: r.lastSeenAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}
