import Redis from "ioredis";
import { Server } from "socket.io";
import redisConfig from "../config/redisConfig";

export function setupRedisSubscriber(io: Server, redis: Redis) {
  const subscriber = new Redis(redisConfig);

  subscriber.psubscribe("driver:*", (err, count) => {
    if (err) {
      console.error("❌ psubscribe error:", err);
    } else {
      console.log(`📡 Subscribed to ${count} driver channel(s)`);
    }
  });

  subscriber.on("pmessage", async (pattern, channel, message) => {
    try {
      const parsed = JSON.parse(message);
      const data = await redis.hgetall(channel);
      const socketId = data?.socketId;

      if (!socketId) {
        console.warn(`⚠️ No socketId found in Redis for ${channel}`);
        return;
      }

      const socket = io.of("/").sockets.get(socketId);
      if (socket) {
        socket.emit("message", parsed);
        console.log(
          `📨 Relayed to driver ${channel} via socket ${socketId}:`,
          parsed
        );
      } else {
        console.warn(`⚠️ Socket not found for socketId ${socketId}`);
      }
    } catch (err) {
      console.error("❌ Error in pmessage handler:", err);
    }
  });
}
