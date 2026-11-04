# Work Summary

This is the work needed to deliver v1, in build order. Details are in `spec.md`. Each stage ends with something you can open and review before the next one starts.

**Timeline:** OutSystems comes first and doubles as the real-world test of the app. Java OCP study follows later in November 2026. The stages are ordered to suit that: everything OutSystems needs comes first, then what Java OCP needs most. Question generation and in-app import come last because the Claude Code skill already covers getting questions in.

**Size key:** S = small, M = medium, L = large. These compare the stages with each other and aren't time estimates.

## At a glance

| # | Stage | Size | Result |
|---|---|---|---|
| 1 | Project foundation | S | App and test suite run locally with one command each |
| 2 | Theme and component gallery | M | The look of the app, ready for your review |
| 3 | Database and data inspector | M | All tables visible, with your exams seeded |
| 4 | Getting questions in | M | OutSystems practice exam loaded |
| 5 | Taking a quiz | L | Full question and answer loop, with tracking |
| 6 | Home and take-exam screens | L | **Ready for OutSystems practice** |
| 7 | Smart selection and settings | S | Prioritise and sort working, with tunable weights |
| 8 | Content management | M | Fix questions, rate sources, review flags |
| 9 | Readiness | M | Weak spots, exam countdown, quiz history |
| 10 | AI explanations | S | Explain a wrong answer when you ask |
| 11 | Free-form questions | S | Type an answer and have Haiku judge it |
| 12 | Mock exam | M | **Ready for Java OCP study** |
| 13 | AI generation | M | Generate new questions in the app |
| 14 | In-app document import | L | Upload a document and review the draft |

## Testing throughout

Tests are written alongside each stage rather than saved for the end:

- **Logic and API tests** for difficulty, selection, scoring, progress and attempt recording.
- **Component tests** for critical pieces such as answer states.
- **A few end-to-end tests** of core flows, added once those flows exist in Stage 6.

Type checks and tests must pass before any stage is handed to you for review. Tests never call the real Claude API.

## Stages

### 1. Project foundation
Set up the TypeScript project, Vite and React, Hono, Drizzle with automatic migrations, the typed API client, and the test tooling. Add `CLAUDE.md` with the rules from `stack.md`. Add a `.gitignore` covering the database, question bank data, source documents and `.env`.

**You review:** one command starts the app, a test page loads data from the server, and the test suite runs.

### 2. Theme and component gallery
Create the design tokens and the app's one theme, then build the core components: buttons, tiles, progress bars, answer options in every state, code blocks with a copy button, and filters. These all appear on `/dev/components`.

This comes early so the look is agreed before screens depend on it.

**You review:** the overall style and every component state. This is the main checkpoint for "spark joy".

### 3. Database and data inspector
Build the full schema, including users and roles. Seed the admin user and your three subjects and exams. Draft each exam's categories and mock settings from its published objectives, for you to confirm. Build `/dev/data`.

**You review:** the data model in table form, and the seeded categories.

### 4. Getting questions in
Define the canonical JSON format for all question types, build the upload screen with validation and preview, and write the Claude Code skill for converting documents and generating questions. Free-form questions can be imported from here, but stay out of quizzes until Stage 11.

**You review:** convert your OutSystems practice exam and check the result in the inspector, including the report of image questions left out. This tests the format against real, messy material before the quiz is built on it.

### 5. Taking a quiz
Build the quiz screen for single and multi-answer questions in both feedback modes (after each question, or at the end): Markdown and code display, submit, reveal, flagging, keyboard shortcuts, and saving and resuming. Implement attempt recording, exact-match scoring and the difficulty rules. Start quizzes from a simple temporary link for now.

**You review:** answer some questions, then confirm attempts and difficulty in the inspector.

### 6. Home and take-exam screens
Build the home page and progress bars, then the Random and category and source tiles, status filter, feedback option, question cap with presets and a number field, live count and basic sort. Add the results screen with Retry missed and the collapsible Review answers list, because at-the-end feedback depends on it.

The live count and quiz creation share one selection function, with thorough tests, so the count can be trusted.

**You review:** the full study flow from start to finish in both feedback modes, and whether the counts match the quizzes you get.

> **Milestone:** start OutSystems practice here. Bugs and friction you find feed into the following stages.

### 7. Smart selection and settings
Add the priority score, easiest/hardest sorting, and the settings pane for adjusting weights. Rework how the Prioritise option is presented, because its purpose isn't clear in the preview.

**You review:** whether the questions it picks feel right and the option makes sense, then tune the weights.

### 8. Content management
Add create, edit and delete for all content, an edit link inside quizzes, source ratings, the flagged list, and role checks.

**You review:** fix a wrong answer mid-quiz, and confirm its history survives.

### 9. Readiness
Add category accuracy with links to practise weak areas, exam date countdown, readiness estimate, quiz history, and marking an exam as passed, which moves it down the home page list.

**You review:** whether the readiness figure seems believable against what you feel you know.

### 10. AI explanations
Set up the shared Claude client, per-feature model config and usage logging. Add the Generate explanation button using Opus 5.5 with web search, showing sources. One call writes the missing per-answer text for every option on a question, and it's stored with the question. Generated text appears in place of that button, alongside Generate new explanation. Calls only happen when you press a button.

**You review:** the quality of the per-answer text and the cost per question, and confirm that no API calls happen without a button press.

### 11. Free-form questions
Add the text answer field to the quiz screen, the Haiku judge, the question type filter, and judging from the results screen for at-the-end quizzes.

**You review:** whether Haiku's verdicts are fair. Because verdicts are final, this judging prompt deserves careful testing.

### 12. Mock exam
Add the timed mode with no feedback, multiple choice only, with marking questions to return to, pass/fail scoring, and links into results and history.

**You review:** one full mock.

> **Milestone:** ready to start Java OCP study. Convert your Java question sets using the Stage 4 skill.

### 13. AI generation
Build the generation form, the draft review screen, and source naming.

**You review:** generated question quality.

### 14. In-app document import
Add file and URL upload, document processing with chunking, category assignment, and reuse of the draft review screen for imports.

**You review:** the hardest real document you have, such as a book with answers in an appendix.

## Needed from you

- **Claude API access:** Stage 10 onwards needs an API key, and you may want a spending limit on it. Earlier stages don't need one.

## After v1

Docker and home server deployment, and phone access over Tailscale. Login, multiple users and image support stay on the list only if they're ever needed.
