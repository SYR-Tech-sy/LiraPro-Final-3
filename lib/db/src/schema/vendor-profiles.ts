import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const VENDOR_CATEGORIES = [
  "currency",
  "gold",
  "fuel",
  "construction",
  "agriculture",
  "vegetables",
  "food",
  "feed",
  "meat",
  "metals",
  "transport",
  "electronics",
  "local_market",
  "crypto",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const VENDOR_CATEGORIES_AR: Record<VendorCategory, string> = {
  currency: "العملات والصرافة",
  gold: "الذهب والمجوهرات",
  fuel: "المحروقات",
  construction: "مواد البناء",
  agriculture: "المحاصيل الزراعية",
  vegetables: "الخضار والفواكه",
  food: "المواد الغذائية",
  feed: "الأعلاف والثروة الحيوانية",
  meat: "اللحوم",
  metals: "المعادن",
  transport: "النقل والشحن",
  electronics: "الأجهزة والإلكترونيات",
  local_market: "الأسواق المحلية",
  crypto: "الكريبتو والعملات الرقمية",
};

export const SYRIAN_GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية",
  "طرطوس", "دير الزور", "الرقة", "الحسكة", "درعا", "السويداء",
  "القنيطرة", "إدلب",
] as const;

export const vendorProfilesTable = pgTable("vendor_profiles", {
  id: serial("id").primaryKey(),
  supabaseId: text("clerk_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  governorate: text("governorate").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  category: text("category").notNull().$type<VendorCategory>(),
  trustScore: real("trust_score").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  totalPriceEntries: serial("total_price_entries"),
  viewCount: serial("view_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorProfileSchema = createInsertSchema(vendorProfilesTable).omit({
  id: true,
  trustScore: true,
  isActive: true,
  totalPriceEntries: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendorProfile = z.infer<typeof insertVendorProfileSchema>;
export type VendorProfile = typeof vendorProfilesTable.$inferSelect;
