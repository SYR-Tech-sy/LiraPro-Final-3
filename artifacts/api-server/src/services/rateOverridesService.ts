import { db, rateOverridesTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { logOverrideHistory } from "./overrideHistoryService.js";

export interface CurrencyOverride {
  code: string;
  buyPrice?: number;
  sellPrice?: number;
  updatedAt: string;
}

const CURRENCY_KEY_PREFIX = "currency:";
const BUY_SUFFIX = ":buy";
const SELL_SUFFIX = ":sell";

function buyKey(code: string): string {
  return `${CURRENCY_KEY_PREFIX}${code.toUpperCase()}${BUY_SUFFIX}`;
}

function sellKey(code: string): string {
  return `${CURRENCY_KEY_PREFIX}${code.toUpperCase()}${SELL_SUFFIX}`;
}

function codeFromKey(key: string): string {
  return key
    .replace(CURRENCY_KEY_PREFIX, "")
    .replace(BUY_SUFFIX, "")
    .replace(SELL_SUFFIX, "");
}

export async function getAllOverrides(): Promise<Record<string, CurrencyOverride>> {
  const rows = await db
    .select()
    .from(rateOverridesTable)
    .where(like(rateOverridesTable.key, `${CURRENCY_KEY_PREFIX}%`));

  const map: Record<string, { buyPrice?: number; sellPrice?: number; updatedAt: Date }> = {};

  for (const row of rows) {
    if (!row.isManual) continue;
    const code = codeFromKey(row.key);
    if (!map[code]) {
      map[code] = { updatedAt: row.updatedAt };
    }
    if (row.key.endsWith(BUY_SUFFIX)) {
      map[code]!.buyPrice = row.priceSYP;
    } else if (row.key.endsWith(SELL_SUFFIX)) {
      map[code]!.sellPrice = row.priceSYP;
    }
    if (row.updatedAt > map[code]!.updatedAt) {
      map[code]!.updatedAt = row.updatedAt;
    }
  }

  const result: Record<string, CurrencyOverride> = {};
  for (const [code, entry] of Object.entries(map)) {
    result[code] = {
      code,
      buyPrice: entry.buyPrice,
      sellPrice: entry.sellPrice,
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
  return result;
}

export async function setOverride(
  code: string,
  buyPrice?: number,
  sellPrice?: number,
  changedBy?: string,
): Promise<CurrencyOverride> {
  const now = new Date();
  const upperCode = code.toUpperCase();

  if (buyPrice != null) {
    await db
      .insert(rateOverridesTable)
      .values({ key: buyKey(upperCode), type: "currency", priceSYP: buyPrice, isManual: true, updatedAt: now })
      .onConflictDoUpdate({
        target: rateOverridesTable.key,
        set: { priceSYP: buyPrice, isManual: true, updatedAt: now },
      });
  }

  if (sellPrice != null) {
    await db
      .insert(rateOverridesTable)
      .values({ key: sellKey(upperCode), type: "currency", priceSYP: sellPrice, isManual: true, updatedAt: now })
      .onConflictDoUpdate({
        target: rateOverridesTable.key,
        set: { priceSYP: sellPrice, isManual: true, updatedAt: now },
      });
  }

  const avgPrice =
    buyPrice != null && sellPrice != null
      ? (buyPrice + sellPrice) / 2
      : (buyPrice ?? sellPrice ?? null);
  logOverrideHistory("currency", upperCode, "set", avgPrice, changedBy).catch(() => {});

  return {
    code: upperCode,
    buyPrice,
    sellPrice,
    updatedAt: now.toISOString(),
  };
}

export async function deleteOverride(code: string, changedBy?: string): Promise<boolean> {
  const upperCode = code.toUpperCase();
  const buyResult = await db
    .delete(rateOverridesTable)
    .where(eq(rateOverridesTable.key, buyKey(upperCode)))
    .returning();
  const sellResult = await db
    .delete(rateOverridesTable)
    .where(eq(rateOverridesTable.key, sellKey(upperCode)))
    .returning();

  const deleted = buyResult.length > 0 || sellResult.length > 0;
  if (deleted) {
    logOverrideHistory("currency", upperCode, "clear", null, changedBy).catch(() => {});
  }
  return deleted;
}

export async function clearAllOverrides(changedBy?: string): Promise<void> {
  const all = await getAllOverrides();
  const codes = Object.keys(all);

  for (const code of codes) {
    await db
      .delete(rateOverridesTable)
      .where(eq(rateOverridesTable.key, buyKey(code)));
    await db
      .delete(rateOverridesTable)
      .where(eq(rateOverridesTable.key, sellKey(code)));
    logOverrideHistory("currency", code, "clear", null, changedBy).catch(() => {});
  }
}

// ── One-time migration from JSON file ────────────────────────────────────────

interface LegacyCurrencyOverride {
  code: string;
  buyPrice?: number;
  sellPrice?: number;
  updatedAt: string;
}

interface LegacyOverridesData {
  overrides: Record<string, LegacyCurrencyOverride>;
}

const JSON_FILE_PATH = path.resolve(process.cwd(), "rate-overrides.json");

export async function migrateCurrencyJsonFileToDB(): Promise<void> {
  if (!fs.existsSync(JSON_FILE_PATH)) {
    return;
  }

  let parsed: LegacyOverridesData;
  try {
    const raw = fs.readFileSync(JSON_FILE_PATH, "utf-8");
    parsed = JSON.parse(raw) as LegacyOverridesData;
  } catch {
    const corruptPath = `${JSON_FILE_PATH}.corrupt`;
    try {
      fs.renameSync(JSON_FILE_PATH, corruptPath);
    } catch {
      // best-effort — leave the file in place if rename also fails
    }
    return;
  }

  const entries = Object.values(parsed.overrides ?? {});
  for (const entry of entries) {
    if (!entry.code) continue;
    const upperCode = entry.code.toUpperCase();
    const updatedAt = entry.updatedAt ? new Date(entry.updatedAt) : new Date();

    if (entry.buyPrice != null) {
      await db
        .insert(rateOverridesTable)
        .values({ key: buyKey(upperCode), type: "currency", priceSYP: entry.buyPrice, isManual: true, updatedAt })
        .onConflictDoNothing();
    }

    if (entry.sellPrice != null) {
      await db
        .insert(rateOverridesTable)
        .values({ key: sellKey(upperCode), type: "currency", priceSYP: entry.sellPrice, isManual: true, updatedAt })
        .onConflictDoNothing();
    }
  }

  fs.rmSync(JSON_FILE_PATH);
}
