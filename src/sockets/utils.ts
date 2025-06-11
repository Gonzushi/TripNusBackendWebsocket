import Redis from "ioredis";

export function getRedisKey(role: string, id: string): string {
  return `${role === "driver" ? "driver" : "rider"}:${id}`;
}

export function isValidRole(role: string): boolean {
  return role === "driver" || role === "rider";
}

export async function cleanupDriver(redis: Redis, id: string) {
  await Promise.all([
    redis.del(`driver:${id}`),
    redis.zrem("drivers:locations", id),
  ]);
}

export async function cleanupRider(redis: Redis, id: string) {
  await redis.del(`rider:${id}`);
}
