import { db, overrideHistoryTable } from "@workspace/db";
import { desc } from "drizzle-orm";

export interface OverrideHistoryEntry {
  id: number;
  priceType: string;
  key: string;
  action: string;
  priceSYP: number | null;
  changedBy: string | null;
  changedAt: string;
}

export async function logOverrideHistory(
  priceType: string,
  key: string,
  action: "set" | "clear",
  priceSYP?: number | null,
  changedBy?: string | null,
): Promise<void> {
  await db.insert(overrideHistoryTable).values({
    priceType,
    key,
    action,
    priceSYP: priceSYP ?? null,
    changedBy: changedBy ?? null,
    changedAt: new Date(),
  });
}

export async function getOverrideHistory(limit = 50): Promise<OverrideHistoryEntry[]> {
  const rows = await db
    .select()
    .from(overrideHistoryTable)
    .orderBy(desc(overrideHistoryTable.changedAt))
    .limit(limit);
  return rows.map(r => ({
    id: r.id,
    priceType: r.priceType,
    key: r.key,
    action: r.action,
    priceSYP: r.priceSYP ?? null,
    changedBy: r.changedBy ?? null,
    changedAt: r.changedAt.toISOString(),
  }));
}
