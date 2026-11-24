import { Request, Response, Router } from "express";
import { pool } from "../db/pool";
import { redisClient } from "../config/redis";

const router = Router();

const CACHE_KEY = "tasks:all";

const CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS ?? 30);

// GET: All Tasks
router.get("/", async (_req: Request, res: Response) => {
  const cachedData = await redisClient.get(CACHE_KEY);

  if (cachedData) {
    res.json({
      source: "cache",
      data: JSON.parse(cachedData),
    });
    return;
  }

  const { rows } = await pool.query("SELECT * FROM tasks ORDER BY id DESC");

  await redisClient.set(CACHE_KEY, JSON.stringify(rows), { EX: CACHE_TTL });

  res.json({
    source: "database",
    data: rows,
  });
});

// POST: Create Task
router.post("/", async (req: Request, res: Response) => {
  const { title, description } = req.body ?? {};

  if (typeof title !== "string" || !title.trim() || title.trim().length > 150) {
    res.status(400).json({
      message: "Valid title is required (max 150 characters)",
    });
    return;
  }

  if (description !== undefined && typeof description !== "string") {
    res.status(400).json({
      message: "Description must be a string",
    });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description)
     VALUES ($1, $2)
     RETURNING *`,
    [title.trim(), description?.trim() || null],
  );

  await redisClient.del(CACHE_KEY);

  res.status(201).json({
    message: "Task created successfully",
    data: rows[0],
  });
});

// PATCH: Update Task
router.patch("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Invalid task ID" });
    return;
  }

  const body = req.body ?? {};
  const allowedFields = ["title", "description", "completed"];

  const keys = Object.keys(body);

  if (keys.length === 0 || keys.some((key) => !allowedFields.includes(key))) {
    res.status(400).json({
      message: "Provide valid fields to update",
    });
    return;
  }

  if (
    "title" in body &&
    (typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.trim().length > 150)
  ) {
    res.status(400).json({ message: "Invalid title" });
    return;
  }

  if (
    "description" in body &&
    body.description !== null &&
    typeof body.description !== "string"
  ) {
    res.status(400).json({ message: "Invalid description" });
    return;
  }

  if ("completed" in body && typeof body.completed !== "boolean") {
    res.status(400).json({ message: "Invalid completed value" });
    return;
  }

  const columnMap: Record<string, string> = {
    title: "title",
    description: "description",
    completed: "completed",
  };

  const values: (string | boolean | null | number)[] = [];

  const updates = keys.map((key) => {
    let value = body[key];

    if (key === "title") {
      value = (value as string).trim();
    }

    values.push(value);

    return `${columnMap[key]} = $${values.length}`;
  });

  values.push(id);

  const query = `
    UPDATE tasks
    SET ${updates.join(", ")}, updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  await redisClient.del(CACHE_KEY);

  res.json({
    message: "Task updated successfully",
    data: rows[0],
  });
});

// DELETE: Delete Task
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Invalid task ID" });
    return;
  }

  const { rows } = await pool.query(
    "DELETE FROM tasks WHERE id = $1 RETURNING id",
    [id],
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  await redisClient.del(CACHE_KEY);

  res.json({
    message: "Task deleted successfully",
  });
});

export default router;
