import express, { type Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { initDb } from "./db.js";

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Message {
  id: number;
  project_id: number;
  title: string;
  body: string;
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

  app.get("/api/projects/:id/messages", (req, res) => {
    const projectId = Number(req.params.id);
    const rows = db.prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at DESC").all(projectId) as unknown as Message[];
    if (!rows.length) {
      res.status(404).json({ error: "project not found" });
      return;
    }
    res.json(rows);
  });

  app.post("/api/projects/:id/messages", (req, res) => {
    const projectId = Number(req.params.id);
    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "");
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const projectExists = db.prepare("SELECT 1 FROM projects WHERE id = ?").get(projectId) !== undefined;
    if (!projectExists) {
      res.status(404).json({ error: "project not found" });
      return;
    }
    const row = db
      .prepare("INSERT INTO messages (project_id, title, body) VALUES (?, ?, ?) RETURNING *")
      .get(projectId, title, body) as unknown as Message;
    res.status(201).json(row);
  });

  app.use(express.static("public"));

  return app;
}

const isMain = process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts");
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  const db = initDb();
  createApp(db).listen(port, () => console.log(`basecamp-clone on :${port}`));
}