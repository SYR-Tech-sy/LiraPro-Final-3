import { db, rateOverridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface GoldOverride {
  pricePerGramSYP: number;
  isManual: boolean;
  updatedAt: string;
}

export interface MetalOverride {
  symbol: string;
  priceSYP: number;
  isManual: boolean;
  updatedAt: string;
}

const GOLD_KEY = "gold";

export async function getGoldOverride(): Promise<GoldOverride | null> {
  const rows = await db
    .select()
    .from(rateOverridesTable)
    .where(eq(rateOverridesTable.key, GOLD_KEY))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    pricePerGramSYP: row.priceSYP,
    isManual: row.isManual,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function setGoldOverride(pricePerGramSYP: number): Promise<GoldOverride> {
  const now = new Date();
  await db
    .insert(rateOverridesTable)
    .values({ key: GOLD_KEY, type: "gold", priceSYP: pricePerGramSYP, isManual: true, updatedAt: now })
    .onConflictDoUpdate({
      target: rateOverridesTable.key,
      set: { priceSYP: pricePerGramSYP, isManual: true, updatedAt: now },
    });
  return { pricePerGramSYP, isManual: true, updatedAt: now.toISOString() };
}

export async function clearGoldOverride(): Promise<void> {
  await db.delete(rateOverridesTable).where(eq(rateOverridesTable.key, GOLD_KEY));
}

export async function getMetalOverride(symbol: string): Promise<MetalOverride | null> {
  const key = `metal:${symbol.toUpperCase()}`;
  const rows = await db
    .select()
    .from(rateOverridesTable)
    .where(eq(rateOverridesTable.key, key))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    symbol: symbol.toUpperCase(),
    priceSYP: row.priceSYP,
    isManual: row.isManual,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAllMetalOverrides(): Promise<Record<string, MetalOverride>> {
  const rows = await db
    .select()
    .from(rateOverridesTable)
    .where(eq(rateOverridesTable.type, "metal"));
  const result: Record<string, MetalOverride> = {};
  for (const row of rows) {
    const symbol = row.key.replace(/^metal:/, "");
    result[symbol] = {
      symbol,
      priceSYP: row.priceSYP,
      isManual: row.isManual,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  return result;
}

export async function setMetalOverride(symbol: string, priceSYP: number): Promise<MetalOverride> {
  const key = `metal:${symbol.toUpperCase()}`;
  const now = new Date();
  await db
    .insert(rateOverridesTable)
    .values({ key, type: "metal", priceSYP, isManual: true, updatedAt: now })
    .onConflictDoUpdate({
      target: rateOverridesTable.key,
      set: { priceSYP, isManual: true, updatedAt: now },
    });
  return { symbol: symbol.toUpperCase(), priceSYP, isManual: true, updatedAt: now.toISOString() };
}

export async function clearMetalOverride(symbol: string): Promise<void> {
  const key = `metal:${symbol.toUpperCase()}`;
  await db.delete(rateOverridesTable).where(eq(rateOverridesTable.key, key));
}
