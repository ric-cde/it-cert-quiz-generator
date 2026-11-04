# Certification Quiz App: Spec

**Purpose:** help one developer pass Java SE 21 OCP, OutSystems Associate Developer (O11) and Claude Developer Professional, by bringing scattered question sets into one place and tracking results across them.

**Order of use:** OutSystems comes first and is also the real-world test of the app. Java OCP study follows later in November 2026, so the app needs to be solid by then.

**Design principles:** minimalist, readable, fast. The only friction should be the difficulty of the questions. Build in small, modular stages, with a review after each one.

This spec reflects the clarifying Q&A and takes precedence over `overview.md` where they differ.

## 1. Scope

| | In scope |
|---|---|
| **v1** | Runs locally on the laptop (frontend + backend). One seeded admin user. Everything in this spec. |
| **v2** | Phone access to a home server over Tailscale (Docker). |
| **Only if ever needed** | Login and multiple users, with anonymous users on localStorage, synced to the database when they create an account. |
| **Not planned yet** | Images in questions, drag/order/match formats, PWA, user data download/upload (backup means copying the SQLite file). |

## 2. Domain model

Hierarchy: **Subject > Exam > Category > Source > Name**

- Each **Exam** has its own list of categories and its own sources.
- **Category** comes first in the UI, because many sources cover the same category. In the data it is a label on each question, not a parent of Source, because one chapter can span several categories.
- **Name** is a chapter or other grouping inside a Source.
- Every question belongs to exactly one Name and one Category.

### Question types

| Type | Behaviour |
|---|---|
| Single answer | Radio options. |
| Multi-answer | Checkboxes for "choose two" / "all that apply". Scored all-or-nothing. |
| Free-form | Text, multi-line or code answer with a stored model answer, judged by Claude Haiku. Stored in banks and mixed into quizzes like any other question. |

Question and option text is Markdown, including code blocks. Each option has optional explanation text, and the UI shows nothing where it is blank. Options are shuffled unless the question is marked `lockOptionOrder`, for example for "all of the above".

### Tables

| Table | Key fields |
|---|---|
| `users` | name, role (`admin` / `editor` / `learner`) |
| `subjects` | name |
| `exams` | subjectId, name, mockQuestionCount, mockTimeLimitMin, passMarkPct |
| `user_exams` | userId, examId, examDate |
| `categories` | examId, name, weight (optional) |
| `sources` | examId, name, rating (1-5, optional), origin (`upload` / `import` / `generated`) |
| `names` | sourceId, name |
| `questions` | nameId, categoryId, type, bodyMd, modelAnswerMd, lockOptionOrder, externalId, contentHash, flaggedAt, flagReason, deletedAt |
| `options` | questionId, bodyMd, explanationMd, isCorrect, position, deletedAt |
| `explanations` | questionId, selectedOptionIds, bodyMd, model, createdAt |
| `quizzes` | userId, examId, mode (`study` / `mock`), config, questionIds, position, startedAt, finishedAt |
| `attempts` | userId, questionId, quizId, selectedOptionIds, responseText, result (`correct` / `partial` / `incorrect`), kind (`answered` / `revealed`), feedbackMd, durationMs, createdAt |
| `question_stats` | userId, questionId, difficulty, attemptCount, correctCount, streak, latestCorrect, everCorrect, lastSeenAt |
| `drafts` | examId, kind (`import` / `generate`), status, input, draftJson |
| `ai_calls` | purpose, model, inputTokens, outputTokens, createdAt |
| `settings` | userId, priority weights, quiz defaults |

Rules:

- All user data carries `userId`, so adding more users later needs no reshaping.
- `attempts` is the source of truth. `question_stats` is updated in the same transaction and can be rebuilt from it.
- Questions and options are soft-deleted so attempt history survives.

### Difficulty

Difficulty is stored per user and runs from 0 to 10. It starts unset.

| Event | No difficulty yet | Difficulty set |
|---|---|---|
| Incorrect, revealed, or free-form partial | Set to 5 | +1, up to 10 |
| Correct | Set to 3 | -1, down to 0 |

### Progress

Progress bars reflect each question's **latest** attempt:

- **Green:** latest attempt correct. This is the % complete figure.
- **Yellow:** attempted, latest attempt not correct.
- **Empty:** never attempted.

All question types count, and a free-form partial shows yellow. Flagged questions are excluded from the totals.

### Quality

- Rate each **source** from 1 to 5. Higher-rated sources are favoured when prioritising.
- **Flag** any question as bad or wrong. Flagged questions are left out of quizzes and appear in a review list where you can fix or unflag them.

## 3. Screens

### Home

Subjects, with their exams below them, and each exam's sources with progress bars. A Resume link appears if a quiz is unfinished. Links to Generate, Import, Manage and Settings.

### Take exam

**Tiles**, each with a progress bar:

1. **Categories**
2. **Sources**, each expandable to show its Names
3. **Random**, on its own line

**How selections combine:**

- Tiles of the same type add together: Chapter 1 + Chapter 2 gives both.
- Different types narrow: Boyarsky + OOP gives the OOP questions in Boyarsky.
- Source and Name work as one tree:
  - Selecting a Source includes all of its Names.
  - Selecting a Name inside a selected Source narrows that Source to the Name.
  - Selecting Source A plus a Name in Source B gives all of A plus that Name, rather than an empty result.
- These tiles replace the separate Source filter in `overview.md`, and the status filter below covers its "All incorrect" and "All not attempted" presets.
- Random clears the tile selection and draws from the whole exam, still applying the filters.

**Options:**

| Option | Values |
|---|---|
| Status | All, Unanswered (never attempted), Incorrect (latest attempt wrong), Unsolved (never right) |
| Type | All, Multiple choice, Free-form. Defaults to All. |
| Max questions | 20, 50, 100, Max |
| Prioritise | On/off. Decides which questions make the cut when capped. Off means a random pick. |
| Sort | Random, Easiest first, Hardest first. Orders the chosen set. |

A live count always shows the result, for example **"20 of 137 available"**, or **"137 of 137"** on Max.

### Quiz (study mode)

1. The question is shown in Markdown. Code blocks are highlighted and have an icon-only copy button.
2. **Submit** allows one try, then locks the question and shows:
   - your wrong choice highlighted, with its text
   - the correct answer highlighted, with its text
   - any remaining option text that exists
3. **Reveal answer** can be used instead of answering. It highlights the correct answer and shows its text, and counts as a miss.
4. After an incorrect or revealed answer, **Generate explanation** is offered. Nothing is sent to Claude unless you press it.
5. Every question has **Flag** and, with permission, **Edit**.
6. **Next** moves on.

Other behaviour:

- Each attempt is saved immediately, so a quiz can be closed and resumed.
- You can end a quiz early and go to results.
- Keyboard: number keys select, Enter submits or moves on, R reveals, E explains.

### Free-form questions

These appear within ordinary quizzes, and the only visible difference is a text field in place of the options.

- You type an answer and press **Submit for judging**. Haiku returns **correct, partial or incorrect** with short feedback, and the model answer is shown.
- The verdict is final, and partial counts as not correct. Results feed tracking like any other question.
- A brief wait is shown while judging. If the call fails, no attempt is saved, your text is kept and you can retry.
- **Reveal answer** shows the model answer and counts as a miss.
- In the text field, Enter adds a new line and Ctrl+Enter submits. The other keyboard shortcuts are off while typing.

### Results

Score, breakdown by category, missed questions, and one-click **Retry missed**.

### Exam stats

- Accuracy by category over recent attempts, weakest first, each linking to a quiz on that category.
- Exam date and countdown.
- Coverage of the question bank.
- A readiness estimate compared with the pass mark, labelled as an estimate. Calculated from recent category accuracy, weighted by category weight where set, with unseen categories counting as zero.
- Quiz history, with dates, scores and trend.

### Mock exam (late v1 stage)

Uses the exam's question count, time limit and pass mark, with multiple choice questions only. Timer, no feedback until the end, and questions can be marked to come back to. Ends in pass/fail plus the usual results. Answered questions feed normal tracking. Unanswered ones score as wrong but aren't logged as attempts.

### Manage

Create, edit and delete subjects, exams, categories, sources, Names and questions, including answer keys. Includes the flagged list and source ratings. Editing a question keeps its history. Correcting an answer key re-marks past attempts against the new key, using the selections stored with them, and recalculates difficulty and progress. Reveals remain misses.

### Settings

Priority weights and quiz defaults.

## 4. Question selection

All tuning lives in one module, with the weights editable in Settings.

**Priority score** (higher means more likely to be chosen) is a weighted sum of:

- difficulty
- failure rate
- current streak (negative, so a long run of correct answers lowers priority)
- time since last seen
- source rating

Unattempted questions get a neutral value. A hard question you only just got right keeps a high score, and an easy one right first time drops down. Low-scoring questions are skipped only by the cap, never excluded.

**Sort** uses a blend of difficulty and failure rate. Questions with no history sit in the middle.

Difficulty and failure rate overlap and may later merge. Keeping the weights separate makes that easy to test.

## 5. Getting questions in

Both routes below end in the same **canonical JSON format**, validated by one shared Zod schema.

**Route A, built first:**

- **JSON upload** in the app, with a validation report and preview.
- A **Claude Code skill** that converts a document into that JSON, or generates new questions outside the app, using your Claude Code plan rather than API credits.

The format covers all three question types from the start, including free-form questions with their model answers.

**Route B, in-app pipeline, built later:**

1. Upload a PDF, CSV or Markdown file, or paste text or a URL.
2. The server prepares it. PDFs go to Claude directly, and web pages are fetched and reduced to readable text.
3. Claude structures it, assigns categories from the exam's list, and matches answers even when they're in a separate appendix. Long documents are processed in chunks, and nothing is silently truncated.
4. You check a **draft review screen**, where you can edit, discard or approve questions.
5. Approved questions are saved.

Rules for both routes:

- Images aren't supported, so questions that depend on one are left out of the bank and listed in the import report. This includes the image questions in the OutSystems practice exam.
- Duplicates (matching `contentHash`) are flagged in review.
- Re-importing with the same `externalId` updates the question and keeps its history.

## 6. Claude features

| Feature | Input | Default model |
|---|---|---|
| Free-form judging | Question, model answer, your response | `claude-haiku-5-5` (your choice) |
| Question generation | See below | `claude-opus-5-5` |
| Document extraction | Document and exam categories | `claude-opus-5-5` |
| Explanations | Question, all options, your selection, plus web search | `claude-opus-5-5` (your choice) |

Models are set per feature in one config module, so changing one is a one-line edit. At current list prices, per million input/output tokens, Haiku 5.5 is $0.10 / $0.50, Sonnet 5.5 is $2 / $10 and Opus 5.5 is $4 / $20.

**No automatic API calls.** Claude is only called after a deliberate action on a clearly labelled control: Generate explanation, Regenerate, Submit for judging, Generate questions or Process document. Nothing runs in the background or on page load, and showing a saved explanation makes no API call.

Implementation notes:

- Use `@anthropic-ai/sdk` on the server only, with the API key in a git-ignored `.env`.
- Use structured outputs with Zod validation for generation, extraction and judging.
- Log token usage for every call in `ai_calls`, visible in the data inspector.

**Generation form:** exam, categories, count, target difficulty, format (multiple choice or free-form), and optional reference material (pasted or uploaded). The target source defaults to **Generated**, can be renamed in place, and can be swapped for any existing source. The Name defaults to a dated batch label, such as "Batch 2026-11-04", and can be edited. Results always go to the draft review screen before saving.

**Explanations:** stored with the question, keyed by the options selected. Choosing the same wrong answer again shows the saved explanation, and a **Regenerate** action replaces it. After a reveal, the explanation covers the correct answer. A free-form question keeps one explanation, which draws on your latest response. Claude uses the web search tool to check its explanation against current sources, favouring official documentation, and the sources are shown with it. Searches per explanation are capped, and they're billed on top of tokens.

## 7. Permissions

- Roles are `admin`, `editor` and `learner`. Admin and editor can both do full content editing.
- In v1, middleware always resolves to the seeded admin. Real login later replaces only that middleware.
- Every content-changing route checks its role on the server, and the UI hides controls you can't use.

## 8. Developer views

Available from a footer link, for admin only.

- **Data inspector (`/dev/data`):** every table in simple read-only form, with sorting, paging and refresh, so you can confirm that each action wrote what it should.
- **Component gallery (`/dev/components`):** the theme tokens and every component in all of its states on one page, using static sample content.
- **Theme:** colours, type, spacing and radii are CSS variable tokens mapped into Tailwind, so one change applies everywhere. v1 has one theme, agreed at the Stage 2 review, and the tokens leave room for a dark mode later.

## 9. Technical notes

Follows `stack.md`, including its CLAUDE.md rules.

- **Location:** the repo lives in `C:\Projects`, outside OneDrive, because syncing a live SQLite database can lock or corrupt it.
- **Git-ignored data:** the database, question bank data and source documents are never committed. `.gitignore` covers `data/` and `.env` from Stage 1, and imported files are kept under `data/`.
- **Responsive layout** from the start, so v2 on a phone needs little rework.
- **Automated tests** are part of every stage. Logic and API tests cover difficulty, selection, scoring, progress and attempt recording, with a few end-to-end tests of core flows. Claude calls are mocked.

## 10. Risks

- **Copyrighted content:** study guide questions are for personal use, which is another reason to keep them out of git. They would need removing or restricting before any public sharing.
- **Wrong answers in AI output:** generated and extracted questions can be wrong, which could teach you incorrect facts. Draft review, reference material and flagging reduce this but don't eliminate it.
