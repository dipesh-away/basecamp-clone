import express, { type Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { initDb } from "./db.js";

export interface Project {
  id: number;
  name: string;
  description: string;
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

  app.patch("/api/projects/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(404).json({ error: "Invalid project ID" });
      return;
    }

    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const description = String(req.body?.description ?? "");

    const updatedRow = db
      .prepare("UPDATE projects SET name = ?, description = ? WHERE id = ? RETURNING *")
      .get(name, description, id) as unknown as Project;

    if (!updatedRow) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(updatedRow);
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