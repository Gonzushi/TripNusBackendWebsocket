import type Redis from "ioredis";
import type { Queue } from "bullmq";

export let redis: Redis | null = null;
export let rideMatchQueue: Queue | null = null;

export function setSharedInstances(redisClient: Redis, queue: Queue) {
  redis = redisClient;
  rideMatchQueue = queue;
}
