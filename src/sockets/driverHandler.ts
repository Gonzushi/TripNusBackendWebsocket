import { Socket } from "socket.io";
import Redis from "ioredis";

type DriverLocationUpdate = {
  location: { lat: number; lng: number };
  [key: string]: any;
};

const allowedEvents = new Set(["register", "driver:updateLocation"]);

export default function handleDriverEvents(
  socket: Socket,
  redis: Redis,
  key: string
) {
  const driverId = socket.data.id;

  socket.on("driver:updateLocation", async (data: DriverLocationUpdate) => {
    if (
      !data?.location ||
      typeof data.location.lat !== "number" ||
      typeof data.location.lng !== "number"
    ) {
      console.warn(
        `❌ Invalid location payload from driver ${driverId}:`,
        data
      );
      return;
    }

    const { location, ...dataWithoutLocation } = data;

    try {
      await redis.hset(key, dataWithoutLocation);

      await redis.geoadd(
        "drivers:locations",
        location.lng,
        location.lat,
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
