import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { DatabaseSync } from "node:sqlite";
import { initDb } from "../src/db.js";
import { createApp } from "../src/server.js";

let base = "";
let server: ReturnType<ReturnType<typeof createApp>['listen']>; let db: DatabaseSync;

before(async () => {
  db = initDb(':memory:');
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

describe('health', () => {
  it('returns ok', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

describe('projects', () => {
  it('starts empty, creates and lists', async () => {
    let res = await fetch(`${base}/api/projects`);
    assert.deepEqual(await res.json(), []);

    res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Website redesign', description: 'Q4 refresh' }),
    });
    assert.equal(res.status, 201);
    const created = (await res.json()) as { id: number; name: string };
    assert.equal(created.name, 'Website redesign');

    res = await fetch(`${base}/api/projects`);
    const list = (await res.json()) as { id: number }[];
    assert.equal(list.length, 1);
  });

  it('rejects missing name', async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  ' }),
    });
    assert.equal(res.status, 400);
  });

  it('updates project name and description', async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Website redesign', description: 'Q4 refresh' }),
    });
    assert.equal(res.status, 201);
    const created = (await res.json()) as { id: number; name: string };

    const updateRes = await fetch(`${base}/api/projects/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Website', description: 'Updated Q4 refresh' }),
    });
    assert.equal(updateRes.status, 200);
    const updated = (await updateRes.json()) as { id: number; name: string; description: string };
    assert.equal(updated.name, 'Updated Website');
    assert.equal(updated.description, 'Updated Q4 refresh');
  });

  it('rejects empty name on update', async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Website redesign', description: 'Q4 refresh' }),
    });
    assert.equal(res.status, 201);
    const created = (await res.json()) as { id: number; name: string };

    const updateRes = await fetch(`${base}/api/projects/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  ', description: 'Updated Q4 refresh' }),
    });
    assert.equal(updateRes.status, 400);
  });

  it('rejects non-existent project ID', async () => {
    const updateRes = await fetch(`${base}/api/projects/99999`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Website', description: 'Updated Q4 refresh' }),
    });
    assert.equal(updateRes.status, 404);
  });
});