import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { DatabaseSync } from "node:sqlite";
import { initDb } from "../src/db.js";
import { createApp } from "../src/server.js";

let base = "";
let server: ReturnType<ReturnType<typeof createApp>['listen']>; let db: DatabaseSync;

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

describe("messages", () => {
  it("creates and lists messages for a project", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    assert.equal(res.status, 201);
    const createdProject = (await res.json()) as { id: number };

    const messageRes = await fetch(`${base}/api/projects/${createdProject.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Meeting notes", body: "Discuss Q4 goals" }),
    });
    assert.equal(messageRes.status, 201);
    const createdMessage = (await messageRes.json()) as { id: number; title: string; body: string };
    assert.equal(createdMessage.title, "Meeting notes");

    const messagesRes = await fetch(`${base}/api/projects/${createdProject.id}/messages`);
    const messages = (await messagesRes.json()) as { id: number; title: string; body: string }[];
    assert.equal(messages.length, 1);
    assert.equal(messages[0].title, "Meeting notes");
  });

  it("returns 404 for non-existent project", async () => {
    const res = await fetch(`${base}/api/projects/999/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Meeting notes", body: "Discuss Q4 goals" }),
    });
    assert.equal(res.status, 404);
  });

  it("rejects missing title", async () => {
    const res = await fetch(`${base}/api/projects/1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", body: "Discuss Q4 goals" }),
    });
    assert.equal(res.status, 400);
  });
});