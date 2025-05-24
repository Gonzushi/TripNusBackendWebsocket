import express from "express";
import Redis from "ioredis";

export default function healthRoutes(redis: Redis) {
  const router = express.Router();

  router.get("/health", async (req, res): Promise<void> => {
    try {
      const redisStatus = redis.status === "ready" ? "ok" : "not ready";
      res.json({
        status: "ok",
        redis: redisStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        error: (error as Error).message,
      });
    }
  });

  return router;
}
