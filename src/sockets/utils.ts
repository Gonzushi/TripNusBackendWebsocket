import Redis from "ioredis";

export async function getRedisKey(role: string, id: string): Promise<string> {
  return `${role === "driver" ? "driver" : "rider"}:${id}`;
}

export function isValidRole(role: string): boolean {
  return role === "driver" || role === "rider";
}

export async function cleanupDriver(redis: Redis, id: string, vehicle_type: string) {
  await Promise.all([
    redis.del(`driver:${id}`),
    redis.zrem(`drivers:locations:${vehicle_type}`, id),
  ]);
}

export async function cleanupRider(redis: Redis, id: string) {
  await redis.del(`rider:${id}`);
}
