import { Router, type IRouter } from "express";
import healthRouter from "./health";
import exchangeRouter from "./exchange";
import goldRouter from "./gold";
import metalsRouter from "./metals";
import newsRouter from "./news";
import settingsRouter from "./settings";
import marketPricesRouter from "./market-prices";
// Supabase v2 routes (primary — these take priority)
import supabaseProfileRouter from "./supabase-profile";
import supabaseAdminRouter from "./supabase-admin";
import supabaseAlertsRouter from "./supabase-alerts";
import supabaseVendorsRouter from "./supabase-vendors";
// Admin vendor + price management
import adminVendorsRouter from "./admin-vendors";
// Drizzle-based feature routes
import alertsRouter from "./alerts";
// Legacy Drizzle routes (kept for backward compat — non-conflicting ones only)
import notificationsRouter from "./notifications";
import vendorRouter from "./vendor";
import applicationsRouter from "./applications";
import verifyRequestsRouter from "./verify-requests";
import supportChatRouter from "./support-chat";
import supportTicketsRouter from "./support-tickets";
import avatarRouter from "./avatar";
import downloadRouter from "./download";
import pushRouter from "./push";
import sessionsRouter from "./sessions";

const router: IRouter = Router();

// Core public routes
router.use(healthRouter);
router.use(exchangeRouter);
router.use(goldRouter);
router.use(metalsRouter);
router.use(newsRouter);
router.use(settingsRouter);
router.use(marketPricesRouter);

// Supabase v2 routes — registered first so they take priority
router.use(supabaseProfileRouter);
router.use(supabaseAdminRouter);
router.use(supabaseAlertsRouter);
router.use(supabaseVendorsRouter);

// Admin vendor + price management
router.use(adminVendorsRouter);

// Drizzle-based alerts (GET/POST/PUT/DELETE /api/alerts, POST /api/alerts/check)
router.use(alertsRouter);

// Legacy routes (non-conflicting with Supabase routes)
router.use(notificationsRouter);
router.use(vendorRouter);
router.use(applicationsRouter);
router.use(verifyRequestsRouter);

// Support tickets (backend storage)
router.use(supportTicketsRouter);
// AI support chat + avatar upload
router.use(supportChatRouter);
router.use(avatarRouter);

// Project download (no auth required)
router.use(downloadRouter);

// Web Push notifications
router.use(pushRouter);

// Session management (DB-backed)
router.use(sessionsRouter);

export default router;
