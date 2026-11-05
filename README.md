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

## Databases

`npm start` uses `data/quiz.db`, which holds real study progress, and `npm run dev` uses a separate `data/dev/quiz.db`. Set `DATA_DIR` to move either. To back up, copy the file while the app is stopped.

A new database starts with the admin user, the three exams and their categories, from `src/server/db/seed.ts`. To see what's in it, use the data inspector, linked in the footer. Changes to the seed file only reach a new database, so delete the database file to pick them up, but only if it holds nothing you want to keep.

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
