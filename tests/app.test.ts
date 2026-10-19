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
    const list = (await todolistsRes.json()) as { id: number }[];
    assert.equal(list.length, 1);
  });

  it("rejects missing name", async () => {
    const res = await fetch(`${base}/api/projects/1/todolists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  " }),
    });
    assert.equal(res.status, 400);
  });
});

describe("messages", () => {
  it("lists and creates messages for a project", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    const createdProject = (await res.json()) as { id: number };

    let messagesRes = await fetch(`${base}/api/projects/${createdProject.id}/messages`);
    assert.deepEqual(await messagesRes.json(), []);

    messagesRes = await fetch(`${base}/api/projects/${createdProject.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Meeting notes", body: "Discuss project timeline" }),
    });
    assert.equal(messagesRes.status, 201);
    const createdMessage = (await messagesRes.json()) as { id: number; project_id: number; title: string; body: string };
    assert.equal(createdMessage.title, "Meeting notes");

    messagesRes = await fetch(`${base}/api/projects/${createdProject.id}/messages`);
    const list = (await messagesRes.json()) as { id: number }[];
    assert.equal(list.length, 1);
  });

  it("rejects missing title and body", async () => {
    const res = await fetch(`${base}/api/projects/1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", body: "" }),
    });
    assert.equal(res.status, 400);
  });
});

describe("todos", () => {
  it("lists and creates todos for a todolist", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    const createdProject = (await res.json()) as { id: number };

    const todolistsRes = await fetch(`${base}/api/projects/${createdProject.id}/todolists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Launch checklist" }),
    });
    const createdTodoList = (await todolistsRes.json()) as { id: number };

    let todosRes = await fetch(`${base}/api/todolists/${createdTodoList.id}/todos`);
    assert.deepEqual(await todosRes.json(), []);

    todosRes = await fetch(`${base}/api/todolists/${createdTodoList.id}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Prepare launch checklist" }),
    });
    assert.equal(todosRes.status, 201);
    const createdTodo = (await todosRes.json()) as { id: number; todolist_id: number; title: string; done: number };
    assert.equal(createdTodo.title, "Prepare launch checklist");

    todosRes = await fetch(`${base}/api/todolists/${createdTodoList.id}/todos`);
    const list = (await todosRes.json()) as { id: number }[];
    assert.equal(list.length, 1);
  });

  it("rejects missing title", async () => {
    const res = await fetch(`${base}/api/todolists/1/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    assert.equal(res.status, 400);
  });

  it("toggles todo completion", async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Website redesign", description: "Q4 refresh" }),
    });
    const createdProject = (await res.json()) as { id: number };

    const todolistsRes = await fetch(`${base}/api/projects/${createdProject.id}/todolists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Launch checklist" }),
    });
    const createdTodoList = (await todolistsRes.json()) as { id: number };

    const todosRes = await fetch(`${base}/api/todolists/${createdTodoList.id}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Prepare launch checklist" }),
    });
    const createdTodo = (await todosRes.json()) as { id: number; todolist_id: number; title: string; done: number };

    let toggleRes = await fetch(`${base}/api/todos/${createdTodo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    assert.equal(toggleRes.status, 200);
    const updatedTodo = (await toggleRes.json()) as { id: number; todolist_id: number; title: string; done: number };
    assert.equal(updatedTodo.done, 1);

    toggleRes = await fetch(`${base}/api/todos/${createdTodo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: false }),
    });
    assert.equal(toggleRes.status, 200);
    const updatedTodo2 = (await toggleRes.json()) as { id: number; todolist_id: number; title: string; done: number };
    assert.equal(updatedTodo2.done, 0);
  });

  it("rejects invalid done value", async () => {
    const res = await fetch(`${base}/api/todolists/1/todos/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: "yes" }),
    });
    assert.equal(res.status, 400);
  });
});