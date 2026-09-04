# Canonization Workbench — Frontend

React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + wouter + TanStack Query.

- `npm install` then `npm run dev` (http://localhost:5173) — `/api` is proxied to the FastAPI backend at `http://127.0.0.1:8471`.
- `npm run build` (tsc strict + vite build), `npm run test` (vitest smoke: login screen on 401).

Governed rule: every AI-generated object is CANDIDATE_DRAFT — NOT ADMITTED until a human ruling
(POST /api/rulings) promotes it. The UI surfaces canon_status on every record.
