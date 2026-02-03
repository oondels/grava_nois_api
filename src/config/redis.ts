import { createClient } from "redis";

import { config } from "./dotenv";
import { logger } from "../utils/logger";

export const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password || undefined,
});

redisClient.on("error", (err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error("redis", `Redis error: ${message}`);
});

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) return;
  try {
    await redisClient.connect();
    logger.info("redis", "Redis conectado.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("redis", `Falha ao conectar ao Redis: ${message}`);
    throw err;
  }
}
