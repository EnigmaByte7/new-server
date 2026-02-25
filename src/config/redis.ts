import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379/0",
});

export  type RedisClient = typeof redis;

redis.on("error", (err) => {
  console.error("Redis Error:", err);
});

redis.on('connect', () => console.log('redis connected'))
redis.on('error', () => console.log('error connecting to redis'))
redis.on('ready', () => console.log('redis ready'))
redis.on('reconnecting', () => console.log('redis reconnecting'))

export async function initRedis() {
  await redis.connect();
  console.log(await redis.ping())
 
  console.log("Redis connected");
}
