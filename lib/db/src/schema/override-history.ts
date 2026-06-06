import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";

export const overrideHistoryTable = pgTable("override_history", {
  id: serial("id").primaryKey(),
  priceType: text("price_type").notNull(),
  key: text("key").notNull(),
  action: text("action").notNull(),
  priceSYP: real("price_syp"),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export type OverrideHistoryRow = typeof overrideHistoryTable.$inferSelect;
