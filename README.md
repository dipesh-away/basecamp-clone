# Basecamp Clone

A simple, intuitive project-management tool in the spirit of Basecamp:
**projects** organize work, **to-dos** track it, **messages** discuss it.

## Current state (v0.1 skeleton)

- `GET /api/health`
- `GET /api/projects`, `POST /api/projects`
- Minimal web UI at `/` (list + add projects)
- SQLite storage (`node:sqlite`, no native deps)

## Roadmap (each item = one small agent-sized issue)

1. To-do lists: `todolists` table + CRUD nested under projects
2. To-do items: add/complete/reopen/delete within a list
3. Assign to-dos + due dates
4. Messages board: post + list per project
5. Project overview page: lists, recent messages, progress counts
6. Search across projects / to-dos / messages

## Dev

```sh
npm install
npm test   # typecheck + tests
npm run dev # :3000
```
