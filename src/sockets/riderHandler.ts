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
    if (
      !data.lat ||
      !data.lng ||
      typeof data.lat !== "number" ||
      typeof data.lng !== "number"
    ) {
      console.warn(`❌ Invalid location payload from rider ${riderId}:`, data);
      return;
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
