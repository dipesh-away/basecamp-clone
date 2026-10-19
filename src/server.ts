import express, { type Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { initDb } from "./db.js";

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface TodoList {
  id: number;
  project_id: number;
  name: string;
  created_at: string;
}

export interface Message {
  id: number;
  project_id: number;
  title: string;
  body: string;
  created_at: string;
}

export interface Todo {
  id: number;
  todolist_id: number;
  title: string;
  done: number;
  created_at: string;
}

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/projects", (_req, res) => {
    const rows = db.prepare("SELECT * FROM projects ORDER BY id").all() as unknown as Project[];
    res.json(rows);
  });

  app.post("/api/projects", (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const description = String(req.body?.description ?? "");
    const row = db
      .prepare("INSERT INTO projects (name, description) VALUES (?, ?) RETURNING *")
      .get(name, description) as unknown as Project;
    res.status(201).json(row);
  });

  app.get("/api/projects/:id/todolists", (req, res) => {
    const projectId = parseInt(req.params.id, 10);
    const rows = db
      .prepare("SELECT * FROM todolists WHERE project_id = ? ORDER BY id")
      .all(projectId) as unknown as TodoList[];
    if (rows.length === 0) {
      res.status(200).json([]);
    } else {
      res.json(rows);
    }
  });

  app.post("/api/projects/:id/todolists", (req, res) => {
    const projectId = parseInt(req.params.id, 10);
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const projectExists = db
      .prepare("SELECT 1 FROM projects WHERE id = ?")
      .get(projectId) !== undefined;
    if (!projectExists) {
      res.status(404).json({ error: "project not found" });
      return;
    }
    const row = db
      .prepare("INSERT INTO todolists (project_id, name) VALUES (?, ?) RETURNING *")
      .get(projectId, name) as unknown as TodoList;
    res.status(201).json(row);
  });

  app.patch("/api/projects/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(404).json({ error: "project not found" });
      return;
    }
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const description = String(req.body?.description ?? "");
    const updated = db
      .prepare("UPDATE projects SET name = ?, description = ? WHERE id = ? RETURNING *")
      .get(name, description, id) as unknown as Project;
    if (!updated) {
      res.status(404).json({ error: "project not found" });
      return;
    }
    res.json(updated);
  });

  app.get("/api/projects/:id/messages", (req, res) => {
    const projectId = parseInt(req.params.id, 10);
    const rows = db
      .prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY id")
      .all(projectId) as unknown as Message[];
    if (rows.length === 0) {
      res.status(200).json([]);
    } else {
      res.json(rows);
    }
  });

  app.post("/api/projects/:id/messages", (req, res) => {
    const projectId = parseInt(req.params.id, 10);
    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    if (!title || !body) {
      res.status(400).json({ error: "title and body are required" });
      return;
    }
    const projectExists = db
      .prepare("SELECT 1 FROM projects WHERE id = ?")
      .get(projectId) !== undefined;
    if (!projectExists) {
      res.status(404).json({ error: "project not found" });
      return;
    }
    const row = db
      .prepare("INSERT INTO messages (project_id, title, body) VALUES (?, ?, ?) RETURNING *")
      .get(projectId, title, body) as unknown as Message;
    res.status(201).json(row);
  });

  app.get("/api/todolists/:id/todos", (req, res) => {
    const todolistId = parseInt(req.params.id, 10);
    const rows = db
      .prepare("SELECT * FROM todos WHERE todolist_id = ? ORDER BY id")
      .all(todolistId) as unknown as Todo[];
    if (rows.length === 0) {
      res.status(200).json([]);
    } else {
      res.json(rows);
    }
  });

  app.post("/api/todolists/:id/todos", (req, res) => {
    const todolistId = parseInt(req.params.id, 10);
    const title = String(req.body?.title ?? "").trim();
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const todolistExists = db
      .prepare("SELECT 1 FROM todolists WHERE id = ?")
      .get(todolistId) !== undefined;
    if (!todolistExists) {
      res.status(404).json({ error: "todolist not found" });
      return;
    }
    const row = db
      .prepare("INSERT INTO todos (todolist_id, title) VALUES (?, ?) RETURNING *")
      .get(todolistId, title) as unknown as Todo;
    res.status(201).json(row);
  });

  app.patch("/api/todos/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const done = req.body?.done;
    if (typeof done !== "boolean") {
      res.status(400).json({ error: "done must be a boolean" });
      return;
    }
    const todoExists = db
      .prepare("SELECT 1 FROM todos WHERE id = ?")
      .get(id) !== undefined;
    if (!todoExists) {
      res.status(404).json({ error: "todo not found" });
      return;
    }
    const updated = db
      .prepare("UPDATE todos SET done = ? WHERE id = ? RETURNING *")
      .get(done, id) as unknown as Todo;
    res.json(updated);
  });

  return app;
}