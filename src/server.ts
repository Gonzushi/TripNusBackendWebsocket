// Load environment variables
import dotenv from "dotenv";
dotenv.config();

// Core dependencies
import express from "express";
import { createServer } from "http";

// Third-party libraries
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import Redis from "ioredis";

// Local modules
import { socketConfig } from "./config/socketConfig";
import { adminUiConfig } from "./config/adminUiConfig";
import redisConfig from "./config/redisConfig";
import healthRoutes from "./routes/healthRoutes";
import registerSocketHandlers from "./sockets";

// Initialize services
console.log(redisConfig);

const redis = new Redis(redisConfig);

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, socketConfig);

// Middleware & routes
app.use("/", healthRoutes(redis));

// Socket.IO logic
io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);
  registerSocketHandlers(socket, redis);
});

// Admin UI
instrument(io, adminUiConfig);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
🔌 Socket.IO:       http://localhost:${PORT}
💓 Health check:    http://localhost:${PORT}/health
🛠️  Admin UI:        https://admin.socket.io/
  `);
});
