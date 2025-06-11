import { Socket } from "socket.io";
import Redis from "ioredis";
import handleDriverEvents from "./driverHandler";
import handleRiderEvents from "./riderHandler";
import { getRedisKey, isValidRole } from "./utils";
import { cleanupDriver, cleanupRider } from "./utils";

export default function registerSocketHandlers(socket: Socket, redis: Redis) {
  socket.on("register", async ({ role, id }) => {
    if (!role || !id || !isValidRole(role)) {
      console.warn("❌ Invalid registration payload:", { role, id });
      socket.disconnect();
      return;
    }

    socket.data.role = role;
    socket.data.id = id;

    const key = getRedisKey(role, id);

    try {
      await redis.hset(key, {
        socketId: socket.id,
        last_updated_at: Date.now().toString(),
      });
    } catch (err) {
      console.error(`❌ Failed to save socketId in Redis for ${key}:`, err);
      socket.disconnect();
      return;
    }

    if (role === "driver") {
      handleDriverEvents(socket, redis, key);
    } else {
      handleRiderEvents(socket, redis, key);
    }
  });

  socket.on("disconnect", async () => {
    const { role, id } = socket.data;
    if (!role || !id || !isValidRole(role)) return;

    try {
      if (role === "driver") {
        await cleanupDriver(redis, id);
      } else {
        await cleanupRider(redis, id);
      }

      console.log(`❌ Cleaned up ${role} ${id}`);
    } catch (error) {
      console.error(
        `❌ Error during disconnect cleanup for ${role}:${id}:`,
        error
      );
    }
  });
}
