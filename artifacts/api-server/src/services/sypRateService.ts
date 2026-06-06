import { db, rateOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { logOverrideHistory } from "./overrideHistoryService.js";

const SYP_KEY = "syp";
const DEFAULT_RATE = 13500;

export interface SypRateSettings {
  rate: number;
  isManual: boolean;
  updatedAt: string;
}

export async function getActiveSypRate(): Promise<number> {
  const settings = await getSypRateSettings();
  return settings.isManual ? settings.rate : DEFAULT_RATE;
}

export async function getSypRateSettings(): Promise<SypRateSettings> {
  const rows = await db
    .select()
    .from(rateOverridesTable)
    .where(eq(rateOverridesTable.key, SYP_KEY))
    .limit(1);
  if (!rows.length) {
    return { rate: DEFAULT_RATE, isManual: false, updatedAt: new Date().toISOString() };
  }
  const row = rows[0];
  return {
    rate: row.priceSYP,
    isManual: row.isManual,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const JSON_FILE_PATH = path.resolve(process.cwd(), "syp-rate-settings.json");

export async function migrateJsonFileToDB(): Promise<void> {
  if (!fs.existsSync(JSON_FILE_PATH)) {
    return;
  }

  const existing = await db
    .select()
    .from(rateOverridesTable)
    .where(eq(rateOverridesTable.key, SYP_KEY))
    .limit(1);

  if (existing.length > 0) {
    fs.rmSync(JSON_FILE_PATH);
    return;
  }

  let parsed: SypRateSettings;
  try {
    const raw = fs.readFileSync(JSON_FILE_PATH, "utf-8");
    parsed = JSON.parse(raw) as SypRateSettings;
  } catch {
    return;
  }

  if (typeof parsed.rate === "number" && parsed.rate > 0) {
    await setSypRateSettings(parsed.rate, parsed.isManual ?? true);
  }

  fs.rmSync(JSON_FILE_PATH);
}

export async function setSypRateSettings(rate: number, isManual: boolean, changedBy?: string): Promise<SypRateSettings> {
  const now = new Date();
  await db
    .insert(rateOverridesTable)
    .values({ key: SYP_KEY, type: "syp", priceSYP: rate, isManual, updatedAt: now })
    .onConflictDoUpdate({
      target: rateOverridesTable.key,
      set: { priceSYP: rate, isManual, updatedAt: now },
    });
  await logOverrideHistory("syp", SYP_KEY, isManual ? "set" : "clear", isManual ? rate : null, changedBy).catch(() => {});
  return { rate, isManual, updatedAt: now.toISOString() };
}
