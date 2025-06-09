import { Socket } from "socket.io";
import Redis from "ioredis";
import handleDriverEvents from "./driverHandler";
import handleRiderEvents from "./riderHandler";

const TTL_SECONDS = 120;

export default function registerSocketHandlers(socket: Socket, redis: Redis) {
  socket.on("register", async ({ role, id }) => {
    if (!role || !id) {
      console.log("Invalid registration payload");
      socket.disconnect();
      return;
    }

    socket.data.role = role;
    socket.data.id = id;

    const key = `${role === "driver" ? "driver" : "rider"}:${id}`;

    if (role === "driver") {
      handleDriverEvents(socket, redis, key, TTL_SECONDS);
    } else if (role === "user") {
      handleRiderEvents(socket, redis, key, TTL_SECONDS);
    } else {
      console.log("Need to disconnect");
      socket.disconnect();
    }
  });

  socket.on("disconnect", async () => {
    const { role, id } = socket.data;
    if (!role || !id) return;

    const key = `${role === "driver" ? "driver" : "rider"}:${id}`;

    try {
      await redis.del(key);

      if (role === "driver") {
        await redis.zrem("drivers:locations", id);
      }
    } catch (error) {
      console.error(`Error during disconnect cleanup for ${key}:`, error);
    }

    console.log(`❌ Cleaned up ${role} ${id}`);
  });
}
