import { RedisClientOptions } from "redis";

const redisConfig = {
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD!,
  tls: {
    rejectUnauthorized: false,
  },
};

export const redisAdapterConfig: RedisClientOptions = {
  url: `rediss://:${process.env.REDIS_PASSWORD!}@${process.env
    .REDIS_HOST!}:${process.env.REDIS_PORT!}/0`,
  socket: {
    tls: true,
    host: process.env.REDIS_HOST!,
    // ca: fs.readFileSync("./trip-nus-ca.crt"),
  },
};

export default redisConfig