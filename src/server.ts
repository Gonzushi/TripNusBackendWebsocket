import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import Redis from "ioredis"; // For app data
import { createClient } from "redis"; // For socket.io adapter
import { createAdapter } from "@socket.io/redis-adapter";
import { setupRedisSubscriber } from "./subscribers/index";

import { socketConfig } from "./config/socketConfig";
import { adminUiConfig } from "./config/adminUiConfig";
import redisConfig from "./config/redisConfig";

import healthRoutes from "./routes/healthRoutes";
import registerSocketHandlers from "./sockets";

async function createRedisAdapterClients() {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  return { pubClient, subClient };
}

async function main() {
  // Express and HTTP server
  const app = express();
  const httpServer = createServer(app);

  // Socket.IO server
  const io = new Server(httpServer, socketConfig);

  // Redis client for your app data (ioredis)
  const redis = new Redis(redisConfig);
  redis.on("error", (err) => console.error("Redis error:", err));

  // Create Redis clients for Socket.IO adapter
  const { pubClient, subClient } = await createRedisAdapterClients();

  // Register Redis adapter with Socket.IO
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware & routes
  app.use("/", healthRoutes(redis));

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log(`✅ Connected: ${socket.id}`);
    registerSocketHandlers(socket, redis);
  });

  // 🔥 Setup Redis subscriber
  setupRedisSubscriber(io, redis);

  // Admin UI
  instrument(io, adminUiConfig);

  // Start server
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`
🚀 Server is running on port ${PORT}
🔌 Socket.IO:       http://localhost:${PORT}
🛠️  Admin UI:        https://admin.socket.io/
    `);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
});
