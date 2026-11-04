# CLAUDE.md

## Build workflow

The build follows the stages in `docs/summary.md`. `docs/spec.md` is the authoritative spec.

- **Wait for "start".** Don't begin a stage until I say so.
- **Then keep going until it's finished.** Once I say start, keep looping and building without interruption until the stage is done. Don't stop for routine check-ins or progress reports. The aim is a faster build, with fewer approvals for me and less blocked work for you.
- **Hold questions until the stage is built.** This includes questions you have at the start of a stage. Normally, wait until I can inspect the work. Until then, make a sensible decision, keep going, and list your decisions and questions in your end-of-stage report.
- **Work stage by stage.** At the end of a stage, hand it over for review and don't start the next one until I say so. Sometimes I'll ask for several stages at once. In that case, treat them as one run and only stop when they're all done.
- **Finish with a Git command.** End each stage report with a one-line command that adds, commits and pushes the changes, with a commit message that fits the stage, for me to copy and paste when I'm happy. It must work in PowerShell. Don't run it yourself.

## Project rules

- The frontend calls the API only via the Hono `hc` client, never raw `fetch`.
- All DB access goes through Drizzle, with no raw SQL.
- Schema changes go through `drizzle-kit generate` (`npm run db:generate`), and migrations run automatically on start.
- Validate every request body with Zod.
- Never call the Claude API automatically. Every call must follow a deliberate user action on a clearly labelled control.
- Tests never call the real Claude API.
- Never commit the database, question bank data or source documents. `.gitignore` must cover `data/`, and `.env` holds the API key.
- Add or update tests with every behaviour change, and fix bugs by writing a failing test first.
- After every change, run `npm run typecheck` and `npm test`, and fix all failures before finishing.

## Look and feel

- Use only the tokens in `src/client/theme.css`. Default Tailwind colours are switched off on purpose.
- Keep green and red for marking answers, so they always mean something.
- New components and states go in the gallery at `/dev/components`.
