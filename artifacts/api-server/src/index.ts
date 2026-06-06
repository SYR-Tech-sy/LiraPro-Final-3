import app from "./app";
import { logger } from "./lib/logger";
import { migrateJsonFileToDB } from "./services/sypRateService";

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

migrateJsonFileToDB()
  .then(() => {
    logger.info("SYP rate migration from JSON file completed");
  })
  .catch((err) => {
    logger.warn({ err }, "SYP rate migration from JSON file failed — continuing startup");
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
