import { Socket } from "socket.io";
import Redis from "ioredis";

const allowedEvents = new Set([
  "register",
  "driver:register",
  "driver:updateLocation",
  "driver:acceptRide",
]);

export default function handleDriverEvents(socket: Socket, redis: Redis) {
  const driverId = socket.data.id;

  // On driver authentication
  socket.on("driver:register", async (data) => {
    const { location } = data;
    await redis.set(`driver:${driverId}:connectionId`, socket.id);
    await redis.set(`driver:${driverId}:location`, JSON.stringify(location));
    await redis.set(`driver:${driverId}:occupied`, "false");
    socket.emit("message", { msg: "Driver registered successfully!" });
  });

  // On location update
  socket.on("driver:updateLocation", async (data) => {
    const { location } = data;
    await redis.set(`driver:${driverId}:location`, JSON.stringify(location));
    socket.emit("message", {
      msg: `Location updated to lat: ${data.location.lat.toFixed(
        3
      )}, lng: ${data.location.lng.toFixed(3)}`,
    });
  });

  // On driver accepting a ride
  socket.on("driver:acceptRide", (data) => {
    console.log(`✅ Driver ${driverId} accepted ride ${data.rideId}`);
    // Forward to REST API or emit to user here...
  });

  // Catch-all for unknown events
  socket.onAny((event, ...args) => {
    if (!allowedEvents.has(event)) {
      socket.emit("message", { msg: `Unknown event received: '${event}'` });

      // The last argument might be the callback
      const maybeCallback = args[args.length - 1];
      if (typeof maybeCallback === "function") {
        maybeCallback({ error: `Event '${event}' is not supported.` });
      }
    }
  });
}
