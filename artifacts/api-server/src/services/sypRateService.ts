import { db, rateOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

export async function setSypRateSettings(rate: number, isManual: boolean): Promise<SypRateSettings> {
  const now = new Date();
  await db
    .insert(rateOverridesTable)
    .values({ key: SYP_KEY, type: "syp", priceSYP: rate, isManual, updatedAt: now })
    .onConflictDoUpdate({
      target: rateOverridesTable.key,
      set: { priceSYP: rate, isManual, updatedAt: now },
    });
  return { rate, isManual, updatedAt: now.toISOString() };
}
