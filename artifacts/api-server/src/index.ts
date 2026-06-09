import app from "./app";
import { logger } from "./lib/logger";
import { migrateJsonFileToDB } from "./services/sypRateService";
import { migrateCurrencyJsonFileToDB } from "./services/rateOverridesService";
import { getGoldOverride, getAllMetalOverrides } from "./services/goldMetalRateService";
import { pruneOldHistory } from "./services/overrideHistoryService";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env["ADMIN_TOKEN"]) {
  logger.warn(
    "ADMIN_TOKEN environment variable is not set — admin write endpoints will reject all requests. Set ADMIN_TOKEN to enable admin access.",
  );
}

async function initMetalOverridePersistence(): Promise<void> {
  const goldOverride = await getGoldOverride();
  const metalOverrides = await getAllMetalOverrides();
  const metalCount = Object.keys(metalOverrides).length;

  if (goldOverride?.isManual) {
    logger.info(
      { pricePerGramSYP: goldOverride.pricePerGramSYP, updatedAt: goldOverride.updatedAt },
      "Gold override loaded from DB",
    );
  } else {
    logger.info("No gold override in DB — using live API price");
  }

  if (metalCount > 0) {
    logger.info(
      { overrides: Object.keys(metalOverrides), count: metalCount },
      "Metal overrides loaded from DB",
    );
  } else {
    logger.info("No metal overrides in DB — using live API prices");
  }
}

async function migrateWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T | null> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      logger.warn({ err, attempt, retries }, "Migration attempt failed");
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  return null;
}

async function startServer() {
  try {
    await migrateWithRetry(migrateJsonFileToDB, 3, 1000);
    await migrateWithRetry(migrateCurrencyJsonFileToDB, 3, 1000);
    await initMetalOverridePersistence();
    const deleted = await pruneOldHistory(90);
    if (typeof deleted === "number" && deleted > 0) {
      logger.info({ deleted }, "Pruned old override history entries (>90 days)");
    }

    const server = app.listen(port, (err?: any) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });

    const graceful = (signal: string) => async () => {
      logger.info({ signal }, "Shutdown signal received — closing server");
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("Forcing shutdown after timeout");
        process.exit(1);
      }, 30_000);
    };

    process.on("SIGINT", graceful("SIGINT"));
    process.on("SIGTERM", graceful("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Startup failed");
    process.exit(1);
  }
}

startServer();
