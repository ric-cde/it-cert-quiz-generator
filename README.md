# it-cert-quiz-generator

A personal quiz app for IT certification study. See `docs/spec.md` and `docs/summary.md`.

Needs Node 24.

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies (first time only) |
| `npm run dev` | Runs the app for development at http://localhost:5173 |
| `npm run build`, then `npm start` | Runs the built app for studying at http://localhost:3000 |
| `npm test` | Runs the logic, API and component tests |
| `npm run typecheck` | Checks types |
| `npm run test:e2e` | Runs the browser tests in installed Chrome, on a throwaway database |
| `npm run db:generate` | Creates a migration after a schema change |

The database is at `data/quiz.db` (set `DATA_DIR` to move it). To back up, copy the file while the app is stopped.
