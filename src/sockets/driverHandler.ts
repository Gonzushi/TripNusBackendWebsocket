import { Socket, Server } from "socket.io";
import Redis from "ioredis";
import { DriverData } from "./types";

const allowedEvents = new Set(["register", "driver:updateLocation"]);

export default function handleDriverEvents(
  socket: Socket,
  redis: Redis,
  key: string
) {
  if (socket.data.driverHandlersRegistered) return;
  socket.data.driverHandlersRegistered = true;

  const driverId = socket.data.id;

  socket.on("driver:updateLocation", async (data: DriverData) => {
    console.log("🔌 Incoming event driver updateLocation");
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
      // Save to Redis
      await redis.hset(key, { ...data, socketId: socket.id });

      if (data.availabilityStatus === 'available') {
        await redis.geoadd(`drivers:locations:${data.vehicle_type}`, data.lng, data.lat, driverId);
      } else {
        redis.zrem(`drivers:locations:${data.vehicle_type}`, driverId);
      }

      // Broadcast to subscribed riders
      const room = `driver:${driverId}`;
      socket.to(room).emit("driver:locationUpdate", {
        latitude: data.lat,
        longitude: data.lng,
        heading_deg: data.heading_deg,
        speed_kph: data.speed_kph,
      });

      console.log(
        `✅ Connected: ${socket.id} | Updating location for ${data.role} ${data.id} | ${data.lat}, ${data.lng}`
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
