import express, { NextFunction, Request, Response } from "express";
import taskRoutes from "./routes/task.routes";
import { pool } from "./db/pool";
import { redisClient } from "./config/redis";

const app = express();

app.use(express.json());

app.get("/api/health", async (_req: Request, res: Response) => {
  await pool.query("SELECT 1");

  const redisStatus = await redisClient.ping();

  res.json({
    status: "ok",
    database: "connected",
    redis: redisStatus,
  });
});

app.use("/api/tasks", taskRoutes);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);

  res.status(500).json({
    message: "Internal Server Error",
  });
});

export default app;
