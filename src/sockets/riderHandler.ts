import { Socket } from "socket.io";
import Redis from "ioredis";

export default function handleRiderEvents(socket: Socket, redis: Redis) {
  // On driver authentication
  socket.on("driver:register", async (data) => {
    const { driverId, location } = data;
    socket.data.driverId = driverId;
    await redis.set(`driver:${driverId}:connectionId`, socket.id);
    await redis.set(`driver:${driverId}:location`, JSON.stringify(location));
    await redis.set(`driver:${driverId}:occupied`, "false");
    console.log(`📦 Registered driver ${driverId}`);
  });

  // On location update
  socket.on("driver:updateLocation", async (data) => {
    const { driverId, location } = data;
    await redis.set(`driver:${driverId}:location`, JSON.stringify(location));
  });

  // On driver accepting a ride
  socket.on("driver:acceptRide", (data) => {
    console.log(`✅ Driver ${data.driverId} accepted ride ${data.rideId}`);
    // Forward to REST API or emit to user here...
  });

}