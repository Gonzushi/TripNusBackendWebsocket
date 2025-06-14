import dotenv from "dotenv";
dotenv.config();

/* ---------------- Core & 3rd Party Imports ---------------- */
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { instrument } from "@socket.io/admin-ui";
import Redis from "ioredis";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { Queue } from "bullmq";

/* ---------------- Internal Modules ---------------- */
import redisConfig, { redisAdapterConfig } from "./config/redisConfig";
import { socketConfig } from "./config/socketConfig";
import { adminUiConfig } from "./config/adminUiConfig";
import { setSharedInstances } from "./shared";
import { setupRedisSubscriber } from "./subscribers/index";
import healthRoutes from "./routes/healthRoutes";
import { createDriverRoutes } from "./routes/driverRoutes";
import registerSocketHandlers from "./sockets";
import { setupSwagger } from "./swagger";

/* ---------------- Redis Adapter Setup ---------------- */
async function createRedisAdapterClients() {
  const pubClient = createClient(redisAdapterConfig);
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  return { pubClient, subClient };
}

/* ---------------- Main Server Function ---------------- */
async function main() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, socketConfig);

  const redis = new Redis(redisConfig);
  redis.on("error", (err) => console.error("Redis error:", err));

  const { pubClient, subClient } = await createRedisAdapterClients();
  io.adapter(createAdapter(pubClient, subClient));

  /* ------------- Middleware ------------- */
  app.use(cors());
  app.use(express.json());

  /* ------------- Routes ------------- */
  app.use("/", healthRoutes(redis));
  app.use("/driver", createDriverRoutes(io, redis));
  setupSwagger(app);

  /* ------------- Socket.IO ------------- */
  io.on("connection", (socket) => {
    console.log(`✅ Connected: ${socket.id}`);
    registerSocketHandlers(socket, redis);
  });

  instrument(io, adminUiConfig);

  /* ------------- Redis Subscriber ------------- */
  setupRedisSubscriber(io, redis);

  /* ------------- Shared Instances ------------- */
  const rideMatchQueue = new Queue("ride-matching", { connection: redis });
  setSharedInstances(redis, rideMatchQueue);

  /* ------------- Start Server ------------- */
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`
🚀 Server is running on port ${PORT}
🔌 Socket.IO:     http://localhost:${PORT}
🛠️  Admin UI:      https://admin.socket.io/
📚 Swagger docs:  http://localhost:${PORT}/docs
    `);
  });
}

/* ---------------- Start App ---------------- */
main().catch((err) => {
  console.error("❌ Failed to start server:", err);
});
