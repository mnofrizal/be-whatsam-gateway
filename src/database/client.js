// Centralized Prisma client
import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

// Create a single Prisma client instance
const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug("Database Query", {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log database errors
prisma.$on("error", (e) => {
  logger.error("Database Error", {
    message: e.message,
    target: e.target,
  });
});

// Log database info
prisma.$on("info", (e) => {
  logger.info("Database Info", {
    message: e.message,
    target: e.target,
  });
});

// Log database warnings
prisma.$on("warn", (e) => {
  logger.warn("Database Warning", {
    message: e.message,
    target: e.target,
  });
});

// Graceful shutdown
process.on("beforeExit", async () => {
  logger.info("Disconnecting from database...");
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  logger.info("Received SIGINT, disconnecting from database...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, disconnecting from database...");
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
