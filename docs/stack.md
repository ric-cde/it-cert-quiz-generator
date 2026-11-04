# Quiz App Stack

**Goal:** a personal app that can be built quickly and is reliable enough to study with. Serving other users is unlikely, so nothing here is added for that purpose alone.

## Core

- **TypeScript, single package:** `src/server`, `src/client` and `src/shared`, with no monorepo tooling. Zod schemas used on both sides live in `src/shared`. The client imports server types with `import type` only, which keeps server code out of the browser bundle.
- **Node 24:** already installed (v24.17.0), and supported by `better-sqlite3`.

## Frontend

- **React + Vite:** fast dev server and builds.
- **Tailwind CSS v4:** theme tokens are defined as CSS variables, so one change applies across the app.
- **shadcn/ui, used selectively:** accessible checkboxes, radios, selects, dialogs and tables. The code is copied into the repo and uses the same theme tokens. Tiles, progress bars and answer options are custom-built.
- **React Router:** routing for the app's screens.
- **TanStack Query:** loading, caching and refetching, including the live question count.
- **`react-markdown` + `remark-gfm`:** question and option text, with raw HTML disabled because the content comes from third parties.
- **Shiki:** code highlighting, with languages loaded on demand.
- **`lucide-react`:** icons, including the copy button.

## Backend

- **Hono on `@hono/node-server`:** small and TypeScript-first. Its `hc` client turns frontend/backend mismatches into compile errors.
- **Zod + `@hono/zod-validator`:** validates every request and supplies typed inputs.
- **`@anthropic-ai/sdk`:** server only, using structured outputs validated with Zod. Models are set per feature in one config module.
- **Single process:** Hono serves the API and the built frontend on one port.
- **Long AI jobs run in-process:** a `drafts` row tracks status and the client polls it. No queue is needed.
- **PDFs go straight to Claude:** no PDF parsing library is needed for the in-app import.

## Database

- **SQLite via `better-sqlite3`:** one file on disk, with backup by copying it.
- **Drizzle ORM:** typed schema and queries, with generated migrations that preserve data.
- **Migrations:** run `drizzle-kit generate` on schema changes. The server runs `migrate()` on startup.
- **Location:** `./data` for `npm start` and `./data/dev` for `npm run dev`, either overridable with `DATA_DIR`.

## Testing

- **Vitest:** unit tests for difficulty, selection and scoring logic, and API tests using Hono's `app.request()` against an in-memory SQLite database. Claude calls are mocked, so tests never spend API credits.
- **React Testing Library:** component behaviour for the critical pieces, especially the answer states in the quiz.
- **Playwright:** a few end-to-end tests of core flows, such as setting up a quiz, answering and seeing progress change. These run on the installed Chrome or Edge, which avoids a separate browser download.

## Dev and running locally

- **`node --watch --import tsx` + Vite via `concurrently`:** one command runs both, and Vite proxies `/api` to Hono. (`tsx watch` hangs under `concurrently` on this machine.)
- **`npm run build && npm start`:** runs the production build locally for studying, so development changes can't interrupt a quiz.

## Later (v2)

- **Docker + `tailscale serve` on the eq14:** phone access to a home server. The single process and `DATA_DIR` keep this move simple.
- **Auth:** only needed if the app is ever shared beyond Tailscale.

## CLAUDE.md rules

- The frontend calls the API only via the Hono `hc` client, never raw `fetch`.
- All DB access goes through Drizzle, with no raw SQL.
- Schema changes go through `drizzle-kit generate`, and migrations run automatically on start.
- Validate every request body with Zod.
- Never call the Claude API automatically. Every call must follow a deliberate user action on a clearly labelled control.
- Tests never call the real Claude API.
- Never commit the database, question bank data or source documents. `.gitignore` must cover `data/`, and `.env` holds the API key.
- Add or update tests with every behaviour change, and fix bugs by writing a failing test first.
- After every change, run `tsc --noEmit` and the tests, and fix all failures before finishing.
