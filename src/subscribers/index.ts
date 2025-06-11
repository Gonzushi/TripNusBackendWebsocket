import Redis from "ioredis";
import { Server } from "socket.io";
import redisConfig from "../config/redisConfig";

type ChannelType = "driver" | "rider";

export function setupRedisSubscriber(io: Server, redis: Redis): void {
  const subscriber = new Redis(redisConfig);

  // Subscribe to both driver:* and rider:* channels
  const channelPatterns = ["driver:*", "rider:*"];

  channelPatterns.forEach((pattern) => {
    subscriber.psubscribe(pattern, (err, count) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${pattern}:`, err);
      } else {
        console.log(`📡 Subscribed to ${count} ${pattern} channel(s)`);
      }
    });
  });

  // Handle messages from both channel types
  subscriber.on("pmessage", async (pattern, channel, message) => {
    try {
      const parsedMessage = JSON.parse(message);
      const [prefix, id] = channel.split(":") as [ChannelType, string];

      // Retrieve socketId from Redis hash
      const clientData = await redis.hgetall(channel);
      const socketId = clientData?.socketId;

      if (!socketId) {
        console.warn(`⚠️ No socketId found in Redis for ${channel}`);
        return;
      }

      // Emit the message to the correct client
      const socket = io.of("/").sockets.get(socketId);
      if (socket) {
        socket.emit("message", parsedMessage);
        console.log(
          `📨 Relayed to ${prefix} ${id} via socket ${socketId}:`,
          parsedMessage
        );
      } else {
        console.warn(`⚠️ Socket not found for socketId ${socketId}`);
      }
    } catch (err) {
      console.error("❌ Error processing message from Redis:", err);
    }
  });
}
