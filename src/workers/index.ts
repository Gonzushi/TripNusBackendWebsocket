// workers/index.ts
import "dotenv/config";
import Redis from "ioredis";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { startRideMatchWorker } from "./rideMatchWorker";
import { cleanInactiveDriversWorker } from "./cleanInactiveDriversWorker";
import redisConfigBullMQ from "../config/redisConfig";

const redis = new Redis(redisConfigBullMQ);
const supabase = createSupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const publisher = {
  async publish(channel: string, message: string) {
    return await redis.publish(channel, message);
  },
};

startRideMatchWorker(redis, supabase, publisher);

setInterval(() => {
  cleanInactiveDriversWorker(redis, supabase, publisher);
}, 60 * 1000);
