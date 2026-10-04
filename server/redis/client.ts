import chalk from "chalk";
import { Redis } from "ioredis";
import { Logger } from "@common";
import { getEnvValue } from "../env.ts";

let redisInstance: Redis | null = null;

/**
 * Gets or initializes the shared Redis client singleton.
 *
 * @returns {Redis} The active Redis client instance
 */
export const getRedisClient = (): Redis => {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = getEnvValue("REDIS_URL") || "redis://localhost:6379";

  redisInstance = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  });

  redisInstance.on("connect", () => {
    Logger.log(chalk.green("Redis connected successfully"));
  });

  redisInstance.on("error", (error) => {
    Logger.error(chalk.red("Redis connection error:"), error);
  });

  return redisInstance;
};

/**
 * Closes the active Redis client connection if open.
 *
 * @returns {Promise<void>} Resolves when connection is closed
 */
export const closeRedisConnection = async (): Promise<void> => {
  if (!redisInstance) return;

  try {
    await redisInstance.quit();
  } catch {
    redisInstance.disconnect();
  } finally {
    redisInstance = null;
  }
};
