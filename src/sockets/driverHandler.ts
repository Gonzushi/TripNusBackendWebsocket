import { Socket } from "socket.io";
import Redis from "ioredis";
import { DriverData } from "./types";

const allowedEvents = new Set(["register", "driver:updateLocation"]);

export default function handleDriverEvents(
  socket: Socket,
  redis: Redis,
  key: string
) {
  const driverId = socket.data.id;

  socket.on("driver:updateLocation", async (data: DriverData) => {
    if (
      !data.lat ||
      !data.lng ||
      typeof data.lat !== "number" ||
      typeof data.lng !== "number"
    ) {
      console.warn(
        `❌ Invalid location payload from driver ${driverId}:`,
        data
      );
      return;
    }

    try {
      await redis.hset(key, data);

      await redis.geoadd(
        "drivers:locations",
        data.lng,
        data.lat,
        driverId
      );
    } catch (err) {
      console.error(`❌ Error saving location for driver ${driverId}:`, err);
    }
  });

  socket.onAny((event, ...args) => {
    if (!allowedEvents.has(event)) {
      console.warn(`⚠️ Unknown event '${event}' from driver ${driverId}`);
      socket.emit("message", { msg: `Unknown event received: '${event}'` });

      const maybeCallback = args[args.length - 1];
      if (typeof maybeCallback === "function") {
        maybeCallback({ error: `Event '${event}' is not supported.` });
      }
    }
  });
}
