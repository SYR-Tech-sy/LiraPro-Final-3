import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../../users-data.json");

export interface RegisteredUser {
  id: string;
  supabaseId?: string;
  walletId: string;
  accountType: "private" | "provider";
  ispType?: string;
  fullName?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  dob?: string;
  province?: string;
  city?: string;
  coverageAreas?: string[];
  registeredAt: string;
  lastSeen?: string;
  hasPIN: boolean;
  activityCount?: number;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  restricted?: boolean;
  restrictedUntil?: string;
  restrictReason?: string;
  softDeleted?: boolean;
  deletedAt?: string;
  deleteReason?: string;
}

interface UsersData {
  users: RegisteredUser[];
}

function readData(): UsersData {
  try {
    if (!fs.existsSync(DATA_FILE)) return { users: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as UsersData;
  } catch {
    return { users: [] };
  }
}

function writeData(data: UsersData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function getAllUsers(): RegisteredUser[] {
  return readData().users;
}

export function upsertUser(user: Omit<RegisteredUser, "id"> & { id?: string }): RegisteredUser {
  const data = readData();
  const existing = data.users.findIndex(
    (u) => u.walletId === user.walletId || (user.supabaseId && u.supabaseId === user.supabaseId)
  );

  const entry: RegisteredUser = {
    id: user.id ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...user,
    hasPIN: user.hasPIN ?? false,
    registeredAt: existing >= 0 ? data.users[existing].registeredAt : (user.registeredAt ?? new Date().toISOString()),
    lastSeen: new Date().toISOString(),
  };

  if (existing >= 0) {
    data.users[existing] = { ...data.users[existing], ...entry };
  } else {
    data.users.push(entry);
  }

  writeData(data);
  return entry;
}

export function updateUser(walletId: string, updates: Partial<RegisteredUser>): RegisteredUser | null {
  const data = readData();
  const idx = data.users.findIndex((u) => u.walletId === walletId);
  if (idx < 0) return null;
  data.users[idx] = { ...data.users[idx], ...updates };
  writeData(data);
  return data.users[idx];
}

function findOrCreate(data: UsersData, walletId: string): RegisteredUser {
  let u = data.users.find((u) => u.walletId === walletId || u.supabaseId === walletId);
  if (!u) {
    u = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      walletId,
      supabaseId: walletId,
      accountType: "private",
      registeredAt: new Date().toISOString(),
      hasPIN: false,
    };
    data.users.push(u);
  }
  return u;
}

export function banUser(walletId: string, reason: string): boolean {
  const data = readData();
  const u = findOrCreate(data, walletId);
  u.banned = true;
  u.banReason = reason || "تم الحظر من قبل المدير";
  u.bannedAt = new Date().toISOString();
  writeData(data);
  return true;
}

export function unbanUser(walletId: string): boolean {
  const data = readData();
  const u = findOrCreate(data, walletId);
  u.banned = false;
  u.banReason = undefined;
  u.bannedAt = undefined;
  writeData(data);
  return true;
}

export function restrictUser(walletId: string, reason: string, days: number): boolean {
  const data = readData();
  const u = findOrCreate(data, walletId);
  u.restricted = true;
  u.restrictReason = reason || "تم التقييد من قبل المدير";
  const until = new Date();
  until.setDate(until.getDate() + Math.max(1, days));
  u.restrictedUntil = until.toISOString();
  writeData(data);
  return true;
}

export function unrestrictUser(walletId: string): boolean {
  const data = readData();
  const u = data.users.find((u) => u.walletId === walletId || u.supabaseId === walletId);
  if (!u) return false;
  u.restricted = false;
  u.restrictReason = undefined;
  u.restrictedUntil = undefined;
  writeData(data);
  return true;
}

export function softDeleteUser(walletId: string, reason: string): boolean {
  const data = readData();
  const u = findOrCreate(data, walletId);
  u.softDeleted = true;
  u.deletedAt = new Date().toISOString();
  u.deleteReason = reason || "تم حذف الحساب من قبل المدير";
  writeData(data);
  return true;
}

export function undeleteUser(walletId: string): boolean {
  const data = readData();
  const u = data.users.find((u) => u.walletId === walletId || u.supabaseId === walletId);
  if (!u) return false;
  u.softDeleted = false;
  u.deletedAt = undefined;
  u.deleteReason = undefined;
  writeData(data);
  return true;
}

export function deleteUser(walletId: string): boolean {
  const data = readData();
  const before = data.users.length;
  data.users = data.users.filter((u) => u.walletId !== walletId && u.supabaseId !== walletId);
  if (data.users.length !== before) {
    writeData(data);
    return true;
  }
  return false;
}

export function getActiveUsers(withinMinutes = 60): RegisteredUser[] {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  return readData().users.filter((u) => u.lastSeen && u.lastSeen > cutoff);
}
