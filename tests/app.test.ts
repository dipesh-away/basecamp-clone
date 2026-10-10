import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { DatabaseSync } from "node:sqlite";
import { initDb } from "../src/db.js";
import { createApp } from "../src/server.js";

let base = "";
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let db: DatabaseSync;

before(async () => {
  db = initDb(":memory:");
  const app = createApp(db);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

describe("health", () => {
  it("returns ok", async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

describe("projects", () => {
  it("starts empty, creates and lists", async () => {
    let res = await fetch(`${base}/api/projects`);
    assert.deepEqual(await res.json(), []);

    res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    assert.equal(res.status, 201);
    const created = (await res.json()) as { id: number; name: string };
    assert.equal(created.name, "Website redesign");

    res = await fetch(`${base}/api/projects`);
    const list = (await res.json()) as { id: number }[];
    assert.equal(list.length, 1);
  });

  it("rejects missing name", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  " }),
    });
    assert.equal(res.status, 400);
  });
});

describe("todolists", () => {
  it("lists and creates todolists for a project", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    const createdProject = (await res.json()) as { id: number };

    let todolistsRes = await fetch(`${base}/api/projects/${createdProject.id}/todolists`);
    assert.deepEqual(await todolistsRes.json(), []);

    todolistsRes = await fetch(`${base}/api/projects/${createdProject.id}/todolists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Launch checklist" }),
    });
    assert.equal(todolistsRes.status, 201);
    const createdTodoList = (await todolistsRes.json()) as { id: number; project_id: number; name: string };
    assert.equal(createdTodoList.name, "Launch checklist");

    todolistsRes = await fetch(`${base}/api/projects/${createdProject.id}/todolists`);
    const list = (await todolistsRes.json()) as { id: number; project_id: number; name: string }[];
    assert.equal(list.length, 1);
    assert.equal(list[0].name, "Launch checklist");
  });

  it("returns an empty list for a project with no todolists", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    const createdProject = (await res.json()) as { id: number };

    const todolistsRes = await fetch(`${base}/api/projects/${createdProject.id}/todolists`);
    assert.deepEqual(await todolistsRes.json(), []);
  });

  it("rejects creation with missing name", async () => {
    const res = await fetch(`${base}/api/projects/1/todolists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  " }),
    });
    assert.equal(res.status, 400);
  });

  it("rejects creation for non-existent project", async () => {
    const res = await fetch(`${base}/api/projects/999/todolists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Launch checklist" }),
    });
    assert.equal(res.status, 404);
  });
});
