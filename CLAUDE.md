# CLAUDE.md

## Build workflow

The build follows the stages in `docs/summary.md`. `docs/spec.md` is the authoritative spec.

- **Wait for "start".** Don't begin a stage until I say so.
- **Then keep going until it's finished.** Once I say start, keep looping and building without interruption until the stage is done. Don't stop for routine check-ins or progress reports. The aim is a faster build, with fewer approvals for me and less blocked work for you.
- **Hold questions until the stage is built.** This includes questions you have at the start of a stage. Normally, wait until I can inspect the work. Until then, make a sensible decision, keep going, and list your decisions and questions in your end-of-stage report.
- **Work stage by stage.** Stop for review at the end of each stage, or after the last one when I ask for several at once, and don't start the next until I say "start".
- **Finish with a Git command.** End each stage report with a one-line command that adds, commits and pushes the changes, with a commit message that fits the stage, for me to copy and paste when I'm happy. It must work in Windows cmd, so join commands with `&&`, not `;`. Don't run it yourself.

## Decision and question logs

- **Log decisions in `docs/decisions.md`.** When I ask for a feature or change, or either of us makes a decision about the app, add one line: `YYYY-MM-DD | area | what was decided | who (me or Claude) | why, in a few words`. Skip routine implementation detail that the code already shows.
- **Log open questions in `docs/unanswered.md` when I run `/compact`.** In every compact summary, include a line reading exactly `Unanswered questions`, followed by one bullet for each question you've put to me about the spec or finished work that I haven't answered, in the form `- area | question`, or `- None`. Word each question so it makes sense on its own. A hook (`scripts/log-unanswered.ts`) copies the bullets into the file with the date, so don't write them yourself.
- **Keep it cheap.** Write new decision lines in one batch at the end of the stage or request. Append them with a single shell command, without reading the file first, and never reread, reorder or reword `decisions.md`.
- **Prune when it's free.** When I answer a question that a compact summary listed, delete its line from `unanswered.md` and log the answer as a decision. This is low priority, so don't go looking for stale questions.

## Project rules

- The frontend calls the API only via the Hono `hc` client, never raw `fetch`.
- All DB access goes through Drizzle, with no raw SQL.
- Schema changes go through `drizzle-kit generate` (`npm run db:generate`), and migrations run automatically on start.
- Validate every request body with Zod.
- Never call the Claude API automatically. Every call must follow a deliberate user action on a clearly labelled control.
- Tests never call the real Claude API.
- Never commit the database, question bank data or source documents. `.gitignore` must cover `data/`, and `.env` holds the API key.
- Add or update tests with every behaviour change, and fix bugs by writing a failing test first.
- Extra behaviour beyond the core spec goes behind a feature flag in `src/shared/features.ts`, which adds its switch to Settings by itself. The core spec is never flagged. Delete a flag once its feature is settled.
- Client code imports shared code as `@shared/...`. API routes live in `src/server/routes/`, one file per area.
- After every change, run `npm run format`, `npm run typecheck` and `npm test`, and fix all failures before finishing.

## Look and feel

- Use only the tokens in the active theme. Default Tailwind colours are switched off on purpose.
- Themes are saved files in `src/client/themes/`, and one line in `src/client/theme.css` chooses the active one. When I ask to try a new look, copy the current theme to a new file, point that line at the copy and change only the copy, so I can always switch back. Don't edit a saved theme unless I ask you to change that theme itself. A token added to one theme must be added to all of them.
- Keep green and red for marking answers, so they always mean something.
- Build screens from the shared components, such as `Card`, `Disclosure`, `SectionLabel`, `Button` and `ErrorText`, rather than repeating their classes, so a change to one flows everywhere.
- New components and states go in the gallery at `/dev/components`. Each section is a file in `src/client/pages/gallery/sections/`, listed in `sections.ts`.
- The spec describes behaviour. Visual detail lives in the gallery and the code, not in the spec./
