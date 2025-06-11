import { Socket } from "socket.io";
import Redis from "ioredis";

const allowedEvents = new Set(["register", "rider:updateLocation"]);

export default function handleRiderEvents(
  socket: Socket,
  redis: Redis,
  key: string
) {
  const riderId = socket.data.id;

  // You could extend this in the future with location sharing
  socket.on("rider:updateLocation", async (data) => {
    const { location, ...rest } = data;

    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number"
    ) {
      console.warn(`❌ Invalid location payload from rider ${riderId}:`, data);
      return;
    }

    try {
      await redis.hset(key, rest);
      await redis.geoadd(
        "riders:locations",
        location.lng,
        location.lat,
        riderId
      );
    } catch (err) {
      console.error(`❌ Error saving location for rider ${riderId}:`, err);
    }
  });

  socket.onAny((event, ...args) => {
    if (!allowedEvents.has(event)) {
      console.warn(`⚠️ Unknown event '${event}' from rider ${riderId}`);
      socket.emit("message", { msg: `Unknown event received: '${event}'` });

      const maybeCallback = args[args.length - 1];
      if (typeof maybeCallback === "function") {
        maybeCallback({ error: `Event '${event}' is not supported.` });
      }
    }
  });
}
