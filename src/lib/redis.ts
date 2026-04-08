import { Redis } from "@upstash/redis";
import { getEnv } from "./env";

const env = getEnv();

let redisClient: Redis | null = null;

export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redisClient;
  }

  return null;
}
