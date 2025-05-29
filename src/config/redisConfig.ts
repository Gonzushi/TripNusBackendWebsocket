import { RedisClientOptions } from "redis";

const redisConfig = {
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD!,
};

export const redisAdapterConfig: RedisClientOptions = {
  url: `redis://default:${process.env.REDIS_PASSWORD!}@${process.env
    .REDIS_HOST!}:${process.env.REDIS_PORT!}/0`,
};

export default redisConfig;
