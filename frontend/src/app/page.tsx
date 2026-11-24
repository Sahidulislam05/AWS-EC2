"use client";

import { FormEvent, useEffect, useState } from "react";

interface Task {
  id: number | string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
}

interface TasksResponse {
  source: "database" | "cache";
  data: Task[];
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function fetchTasks() {
    try {
      setError("");

      const response = await fetch("/api/tasks", {
        cache: "no-store",
      });

      const result: TasksResponse & { message?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch tasks");
      }

      setTasks(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTasks();
  }, []);

  // Create Task
  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Task creation failed");
      }

      setTitle("");
      setDescription("");

      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Update Task
  async function handleToggleTask(task: Task) {
    try {
      setError("");

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !task.completed,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Task update failed");
      }

      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  // Delete Task
  async function handleDeleteTask(id: Task["id"]) {
    try {
      setError("");

      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Task deletion failed");
      }

      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Task Manager</h1>

          <p className="mt-2 text-slate-600">
            Next.js + Express + PostgreSQL + Redis
          </p>
        </header>

        {/* Create Task */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Create New Task</h2>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              required
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <textarea
              placeholder="Task description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </form>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
        )}

        {/* Task List */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your Tasks ({tasks.length})</h2>

          {loading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-slate-500">
              No tasks found. Create your first task!
            </div>
          ) : (
            tasks.map((task) => (
              <article
                key={task.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="min-w-0">
                  <h3
                    className={`font-semibold ${
                      task.completed ? "text-slate-400 line-through" : ""
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {task.description}
                    </p>
                  )}

                  <span className="mt-2 inline-block text-xs text-slate-400">
                    {task.completed ? "Completed" : "Pending"}
                  </span>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700"
                  >
                    {task.completed ? "Undo" : "Complete"}
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
