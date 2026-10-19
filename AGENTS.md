# Project conventions

Guidance for any agent working in this repository. Follow it exactly.

## Stack

- Node.js 22+, ESM (`"type": "module"`), TypeScript `strict`.
- Express 4 for HTTP. `node:sqlite` for storage. No other runtime dependencies.
- 2-space indent, double quotes, semicolons, named exports.

## `node:sqlite` rules (read carefully)

- The driver binds **only** `number | string | bigint | null | Uint8Array`. It does **not** accept `boolean`.
  - Store booleans as `INTEGER` `0` / `1`. Convert at the boundary: `const done = req.body.done ? 1 : 0;`
  - Read them back as numbers: `Boolean(row.done)`.
- Always pass parameters as bound values, never string-interpolated SQL.
- Use `RETURNING *` with `.get(...)` for inserts and updates that should return the row.
- `.all(...)` returns an array, `.get(...)` returns one row or `undefined`.

## API behaviour

- `400` for invalid input (missing/blank required field, bad date format).
- `404` when the parent resource does not exist, and when a targeted id does not exist.
- `201` when a resource is created; `200` otherwise.
- JSON error bodies are `{ "error": "..." }`.
- Route shape: list and create are nested under the parent, e.g. `GET|POST /api/projects/:id/todolists`.

## Never regress

- Keep **every** existing route, export, and test. Add to files; never delete working code.
- Do not touch `.github/workflows/`, `package.json`, or lockfiles.
- A change is only done when `npm test` passes.

## Tests

- `node:test` + `node:assert/strict`, run against an in-memory DB (`initDb(":memory:")`).
- Each feature gets its own `describe` block with the happy path and the error paths.

### Do not restructure the test harness

The `before`/`after` hooks, the shared `server`/`db` variables and the
`base` URL setup are already correct. Keep them byte-for-byte and **append new
`describe` blocks**. Rewriting the harness is the single most common way to
break the suite: a throwing `after` hook cancels every other test.

- Add tests by appending; never re-declare `before`, `after`, `server`, `db`, or `base`.
- `npm test` runs `tsc` first, so a type error is a test failure. Booleans from
  `node:sqlite` are numbers — compare with `0`/`1` or wrap in `Boolean(...)`.
