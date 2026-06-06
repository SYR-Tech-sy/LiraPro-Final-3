import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const rateOverridesTable = pgTable("rate_overrides", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  type: text("type").notNull(),
  priceSYP: real("price_syp").notNull(),
  isManual: boolean("is_manual").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type RateOverrideRow = typeof rateOverridesTable.$inferSelect;
