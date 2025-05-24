import { Socket } from "socket.io";
import Redis from "ioredis";
import handleDriverEvents from "./driverHandler";
import handleRiderEvents from "./riderHandler";

export default function registerSocketHandlers(socket: Socket, redis: Redis) {
  socket.on("register", async ({ role, id }) => {
    socket.data.role = role;
    socket.data.id = id;

    if (role === "driver") {
      handleDriverEvents(socket, redis);
    } else if (role === "user") {
      handleRiderEvents(socket, redis);
    } else {
      console.log("Need to disconnect");
      socket.disconnect();
    }
  });

  socket.on("disconnect", async () => {
    const role = socket.data.role;
    const id = socket.data.id;

    if (role === "driver" && id) {
      const keys = await redis.keys(`driver:${id}:*`);
      if (keys.length > 0) await redis.del(...keys);
      console.log(`❌ Cleaned up driver ${id}`);
    } else if (role === "user" && id) {
      const keys = await redis.keys(`rider:${id}:*`);
      if (keys.length > 0) await redis.del(...keys);
      console.log(`❌ Cleaned up rider ${id}`);
    }
  });
}
