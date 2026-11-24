import "dotenv/config";
import app from "./app";
import { pool } from "./db/pool";
import { redisClient } from "./config/redis";

const PORT = Number(process.env.PORT ?? 4000);

async function startServer() {
  await pool.query("SELECT 1");

  console.log("PostgreSQL connected");

  await redisClient.connect();

  console.log("Redis connected");

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
