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

  app.use(express.static("public"));

  return app;
}

const isMain = process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts");
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  const db = initDb();
  createApp(db).listen(port, () => console.log(`basecamp-clone on :${port}`));
}
