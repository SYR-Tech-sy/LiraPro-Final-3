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

migrateJsonFileToDB()
  .then(() => {
    logger.info("SYP rate migration from JSON file completed");
  })
  .catch((err) => {
    logger.warn({ err }, "SYP rate migration from JSON file failed — continuing startup");
  })
  .then(() => migrateCurrencyJsonFileToDB())
  .then(() => {
    logger.info("Currency rate migration from JSON file completed");
  })
  .catch((err) => {
    logger.warn({ err }, "Currency rate migration from JSON file failed — continuing startup");
  })
  .then(() => initMetalOverridePersistence())
  .catch((err) => {
    logger.warn({ err }, "Failed to read metal/gold overrides from DB — DB may be unavailable");
  })
  .then(() => pruneOldHistory(90))
  .then((deleted) => {
    if (typeof deleted === 'number' && deleted > 0) {
      logger.info({ deleted }, "Pruned old override history entries (>90 days)");
    }
  })
  .catch((err) => {
    logger.warn({ err }, "Failed to prune old override history — continuing startup");
  })
  .finally(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  });
