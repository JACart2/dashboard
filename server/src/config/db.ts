import { createClient } from "redis";

const redisUrl =
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const redis = createClient({ url: redisUrl });
const redisPub = createClient({ url: redisUrl });

const redisSub = createClient({ url: redisUrl });
redisPub.connect();
redisSub.connect();

redis.on("error", (err) => console.log("Redis Client Error", err, "\n"));
redis.connect();

export { redis, redisPub, redisSub };
