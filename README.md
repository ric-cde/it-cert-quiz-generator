# it-cert-quiz-generator

A personal quiz app for IT certification study. See `docs/spec.md` and `docs/summary.md`.

Needs Node 24. The app runs on the laptop for development, and lives on the eq14 home server for studying, reachable over Tailscale (see below).

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies (first time only) |
| `npm run dev` | Runs the app for development at http://localhost:5173 |
| `npm run build`, then `npm start` | Runs the built app for studying at http://localhost:3000 |
| `npm test` | Runs the logic, API and component tests |
| `npm run typecheck` | Checks types |
| `npm run format` | Formats the code with Prettier |
| `npm run test:e2e` | Runs the browser tests in installed Chrome, on a throwaway database |
| `npm run db:generate` | Creates a migration after a schema change |
| `npm run icons:build` | Rebuilds the icon artwork after changing the source animals in `src/shared/source-icons.ts` or the exam logos in `src/shared/exam-icons.ts` |

## Databases

`npm start` uses `data/quiz.db` and `npm run dev` uses a separate `data/dev/quiz.db`. Set `DATA_DIR` to move either, and `HOST` to listen on one address only. Real study progress now lives on the eq14 (see below). To back up a laptop database, copy the file while the app is stopped.

A new database starts with the admin user, the three exams and their categories, from `src/server/db/seed.ts`. To see what's in it, use the data inspector, linked in the footer. Changes to the seed file only reach a new database, so delete the database file to pick them up, but only if it holds nothing you want to keep.

## On the eq14

The live copy runs all the time at **https://eq14.codlet-fence.ts.net:8443**, from any device on the tailnet. The code being worked on runs as a preview at **https://eq14.codlet-fence.ts.net:8444**, with live reload and its own dev database, so changes can be checked before they go live.

| Command (on the eq14, in the repo) | What it does |
|---|---|
| `npm run deploy` | Puts the current code live: type checks and tests, build, backup, swap, restart, then a check that it answers. If it doesn't, the previous release goes back live. `--skip-checks` skips the type checks and tests |
| `npm run backup` | Backs up the live database now, into `~/quiz-data/backups` |
| `npm run dev:refresh-db` | Replaces the preview's dev database with a copy of the live one |
| `npm run eq14:install` | Sets up or refreshes the services. Run it again after changing the default Node version |

Where things are:

- **Live copy:** `~/apps/quiz/current`, which points at the newest of the last three releases in `~/apps/quiz/releases`.
- **Study data:** `~/quiz-data/quiz.db`. Never in the repo.
- **Backups:** `~/quiz-data/backups`, taken nightly at 03:30 and before every release, keeping the newest 14 of each.
- **Services:** `quiz` (live), `quiz-preview` and the `quiz-backup` timer, all systemd user services. `systemctl --user status quiz` shows how the live copy is doing, and `journalctl --user -u quiz -n 50` shows its log.

To roll back by hand, point `~/apps/quiz/current` at an earlier release folder and run `systemctl --user restart quiz`. To restore a backup, stop the live copy, copy the backup over `~/quiz-data/quiz.db`, delete any `quiz.db-wal` and `quiz.db-shm` beside it, and start it again.

Node 24 comes from fnm (`fnm list` shows the versions). The system's Node 18 is still at `/usr/bin/node`.

## Question banks

Question banks are JSON files, loaded at `/import`. To make one, use the skill in the Claude app. It can copy existing questions from a PDF, web page or similar, write new ones from study material you upload, or write new ones from its own web research:

1. Run `npm run skill:build`, which creates `dist/skill/creating-question-banks.zip`.
2. In Claude, upload the zip at Customize > Skills and turn it on. Code execution must be enabled.
3. In a chat, attach your source if you have one, and ask Claude for a question bank.
4. Load the file it gives you at `/import`, check the preview, and press Import.

Run `npm run skill:build` and upload the zip again after changing the skill, the format, the checks or the exams. `skill/evals` has a mock source for testing the skill.

For another LLM, share `docs/question-bank.schema.json` and `docs/question-bank.example.json` along with the exam's name and category list. After changing `src/shared/question-bank.ts`, run `npm run bank:schema` to update the schema file.

## Themes

Each look is a saved file in `src/client/themes/`, holding its fonts and design tokens. One line in `src/client/theme.css` chooses the active theme. To try a new look, copy the current theme to a new file, point that line at the copy and change only the copy. To go back, point the line at the old file.

## Settings and feature flags

Settings are at `/settings`, linked from home. Features beyond the core spec can be switched off there. Each is listed once in `src/shared/features.ts`, and the Settings page is built from that list.
