import { Socket } from "socket.io";
import Redis from "ioredis";

const allowedEvents = new Set([
  "register",
  "rider:updateLocation",
  "rider:subscribeToDriver",
  "rider:unsubscribeFromDriver",
]);

export default function handleRiderEvents(
  socket: Socket,
  redis: Redis,
  key: string
) {
  const riderId = socket.data.id;

  // Rider subscribes to a driver to get location updates.
  socket.on("rider:subscribeToDriver", async ({ driverId }) => {
    const room = `driver:${driverId}`;
    socket.join(room);
    console.log(`✅ Rider ${riderId} subscribed to ${room}`);

    // Optional: Send last known location immediately
    const driverKey = `driver:${driverId}`;
    const locationData = await redis.hgetall(driverKey);
    if (locationData?.lat && locationData?.lng) {
      socket.emit("driver:locationUpdate", {
        driverId,
        lat: parseFloat(locationData.lat),
        lng: parseFloat(locationData.lng),
      });
    }
  });

  // Rider unsubscribes from a driver's updates.
  socket.on("rider:unsubscribeFromDriver", ({ driverId }) => {
    const room = `driver:${driverId}`;
    socket.leave(room);
    console.log(`🚫 Rider ${riderId} unsubscribed from ${room}`);
  });

  // Optional: If rider is sending their own location (e.g. for safety or tracking)
  socket.on("rider:updateLocation", async (data) => {
    if (
      !data.lat ||
      !data.lng ||
      typeof data.lat !== "number" ||
      typeof data.lng !== "number"
    ) {
      console.warn(`❌ Invalid rider location from ${riderId}:`, data);
      return;
    }
  });

  // Guard against unknown event
  socket.onAny((event, ...args) => {
    if (!allowedEvents.has(event)) {
      console.warn(`⚠️ Unknown event '${event}' from rider ${riderId}`);
      socket.emit("message", { msg: `Unknown event: '${event}'` });

      const maybeCallback = args[args.length - 1];
      if (typeof maybeCallback === "function") {
        maybeCallback({ error: `Event '${event}' is not supported.` });
      }
    }
  });
}
