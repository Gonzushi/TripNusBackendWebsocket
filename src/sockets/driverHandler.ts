import { Socket } from "socket.io";
import Redis from "ioredis";

const allowedEvents = new Set([
  "register",
  "driver:register",
  "driver:updateLocation",
]);

export default function handleDriverEvents(
  socket: Socket,
  redis: Redis,
  key: string, // expects driver:{driverId}
  ttl: number
) {
  const driverId = socket.data.id;

  socket.on("driver:register", async (data) => {
    const { location, ...dataWithoutLocation } = data;

    await redis.hset(key, "socketId", socket.id);
    await redis.expire(key, ttl);
    await redis.hset(key, dataWithoutLocation);
    await redis.expire(key, ttl);

    // Add geo location
    await redis.geoadd(
      "drivers:locations",
      location.lng,
      location.lat,
      driverId
    );

    socket.emit("message", { msg: "Driver registered successfully!" });
  });

  socket.on("driver:updateLocation", async (data) => {
    const { location } = data;

    // Update geo location
    await redis.geoadd(
      "drivers:locations",
      location.lng,
      location.lat,
      driverId
    );

    // Refresh TTL on driver metadata hash
    await redis.expire(key, ttl);
  });

  socket.onAny((event, ...args) => {
    if (!allowedEvents.has(event)) {
      socket.emit("message", { msg: `Unknown event received: '${event}'` });
      const maybeCallback = args[args.length - 1];
      if (typeof maybeCallback === "function") {
        maybeCallback({ error: `Event '${event}' is not supported.` });
      }
    }
  });
}
