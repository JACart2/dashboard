import { createClient } from "redis";

const redis = createClient();

const redisPub = createClient();
const redisSub = createClient();
redisPub.connect();
redisSub.connect();

redis.on("error", (err) => console.log("Redis Client Error", err));
redis.connect();

export { redis, redisPub, redisSub };
