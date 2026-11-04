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

Hierarchy: **Subject > Exam > Category > Source > Chapter**

- Each **Exam** has its own list of categories and its own sources.
- **Category** comes first in the UI, because many sources cover the same category. In the data it is a label on each question, not a parent of Source, because one chapter can span several categories.
- **Chapter** is a chapter or any other grouping inside a Source, such as a practice set.
- Every question belongs to exactly one Chapter and one Category.

### Question types

| Type | Behaviour |
|---|---|
| Single answer | Radio options. |
| Multi-answer | Checkboxes for "choose two" / "all that apply". The UI doesn't limit how many you can tick. Scored all-or-nothing: correct only if the selection exactly matches the correct options, so the right options plus an extra one is incorrect. |
| Free-form | Text, multi-line or code answer with a stored model answer, judged by Claude Haiku. Stored in banks and mixed into quizzes like any other question. |

Question and option text is Markdown, including code blocks. Each option has optional **per-answer text**, and the UI shows nothing where it is blank. For a wrong answer, this says why it's wrong in 1-3 sentences. For the correct answer, it says something like "Correct! Here's why" in 1-2 sentences. Ideally a bank comes with this text, and if it doesn't, Claude can write it (see section 6). Options are shuffled unless the question is marked `lockOptionOrder`, for example for "all of the above".

### Tables

| Table | Key fields |
|---|---|
| `users` | name, role (`admin` / `editor` / `learner`) |
| `subjects` | name |
| `exams` | subjectId, name, descriptionMd, syllabusMd, mockQuestionCount, mockTimeLimitMin, passMarkPct |
| `user_exams` | userId, examId, examDate, passedAt |
| `categories` | examId, name, weight (optional) |
| `sources` | examId, name, rating (1-5, optional), origin (`upload` / `import` / `generated`) |
| `chapters` | sourceId, name |
| `questions` | chapterId, categoryId, type, bodyMd, modelAnswerMd, lockOptionOrder, externalId, contentHash, flaggedAt, flagReason, deletedAt |
| `options` | questionId, bodyMd, explanationMd, explanationOrigin (`source` / `generated`), isCorrect, position, deletedAt |
| `explanations` | questionId (one per question), bodyMd (free-form questions only), sources, model, createdAt |
| `quizzes` | userId, examId, mode (`study` / `mock`), config, questionIds, position, startedAt, finishedAt |
| `attempts` | userId, questionId, quizId, selectedOptionIds, responseText, result (`correct` / `partial` / `incorrect` / `pending`), kind (`answered` / `revealed`), feedbackMd, durationMs, createdAt |
| `question_stats` | userId, questionId, difficulty, attemptCount, correctCount, streak, latestCorrect, everCorrect, lastSeenAt |
| `drafts` | examId, kind (`import` / `generate`), status, input, draftJson |
| `ai_calls` | purpose, model, inputTokens, outputTokens, createdAt |
| `settings` | userId, priority weights, quiz defaults, syntaxHighlighting |

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

Subjects, with their exams below them, and each exam's sources with progress bars. An exam you've marked as passed shows **Passed** and moves down the list, and can be unmarked. A Resume link appears if a quiz is unfinished. Links to Generate, Import, Manage and Settings.

### Take exam

**Tiles**, in this order:

1. **Random**, a single normal-sized tile at the top
2. **Categories**, each with a progress bar
3. **Sources**, each with a progress bar and expandable to show its Chapters

**How selections combine:**

- Tiles of the same type add together: Chapter 1 + Chapter 2 gives both.
- Different types narrow: Boyarsky + OOP gives the OOP questions in Boyarsky.
- Source and Chapter work as one tree:
  - Selecting a Source includes all of its Chapters.
  - Selecting a Chapter inside a selected Source narrows that Source to the Chapter.
  - Selecting Source A plus a Chapter in Source B gives all of A plus that Chapter, rather than an empty result.
- These tiles replace the separate Source filter in `overview.md`, and the status filter below covers its "All incorrect" and "All not attempted" presets.
- Random clears the tile selection and draws from the whole exam, still applying the filters. While it's selected, the Categories and Sources block is visually diminished, with its text and progress bars greyed. Clicking a tile in that block turns Random off and selects the tile.

**Options:**

| Option | Values |
|---|---|
| Status | All, Unanswered (never attempted), Incorrect (latest attempt wrong), Unsolved (never right) |
| Type | All, Multiple choice, Free-form. Defaults to All. |
| Max questions | 20, 50, 100, Max presets, plus a number field for any other value. A value above what's available is capped by it. |
| Prioritise | On/off. Decides which questions make the cut when capped. Off means a random pick. |
| Sort | Random, Easiest 1st, Hardest 1st. Orders the chosen set. |
| Feedback | After each question, or At the end. See the Quiz section below. The default is set in Settings. |

A live count always shows the result, for example **"20 of 137 available"**, or **"137 of 137"** on Max.

**The live count must be accurate.** "x of y available" is the source of truth: starting the quiz must give exactly x questions, drawn from those y. The count, the tile counts and quiz creation all use one shared selection function on the server, with automated tests covering combinations of tiles and filters.

### Quiz (study mode)

Both feedback modes share these:

- The question is shown in Markdown. Code blocks have icon-only copy and syntax highlighting buttons. The highlighting button changes a saved global setting, because reading plain code is part of preparing for an exam that has no highlighting.
- Every question has **Flag** and, with permission, **Edit**, at the bottom of the card.
- Once locked, your chosen option has a **Your answer** tag in its top right corner. Whether it's right is shown by its mark and colour.
- Each attempt is saved as soon as it's made, so a quiz can be closed and resumed.
- You can end a quiz early and go to results.

**Feedback: After each question**

1. **Submit** allows one try, then locks the question and shows:
   - your wrong choice highlighted, with its text
   - the correct answer highlighted, with its text
   - any remaining option text that exists
2. **Reveal answer** can be used instead of answering. It highlights the correct answer and shows its text, and counts as a miss. The whole question card takes on a slightly different background, so a reveal can't be mistaken for a correct answer.
3. After an incorrect or revealed answer, the explanation area appears (see section 6).
4. **Next** moves on.
5. Keyboard: number keys select, Enter submits or moves on, R reveals, E generates an explanation.

**Feedback: At the end**

1. There is no Submit or Reveal answer, only **Next**. Nothing shows whether you were right.
2. Pressing **Next** records your answer and locks it, and there is no going back. Pressing it with nothing selected skips the question, and no attempt is logged.
3. Answers can be inspected afterwards on the results screen.
4. Keyboard: number keys select, Enter moves on.

### Free-form questions

These appear within ordinary quizzes, and the only visible difference is a text field in place of the options.

- The verdict is final, and partial counts as not correct. Results feed tracking like any other question.
- A brief wait is shown while judging. If the call fails, your text is kept and you can retry.
- In the text field, Enter adds a new line and Ctrl+Enter submits or moves on. The other keyboard shortcuts are off while typing.

**After each question:** you type an answer and press **Submit for judging**. Haiku returns **correct, partial or incorrect** with short feedback, and the model answer is shown. **Reveal answer** shows the model answer and counts as a miss.

**At the end:** **Next** saves your text as a `pending` attempt with no API call, and pending attempts don't affect tracking. The results screen offers **Judge N free-form answers**, and the verdicts then feed the score and tracking. Answers you don't judge straight away stay pending and can be judged later by reopening the quiz from Quiz history.

### Results

Score, breakdown by category and one-click **Retry missed**, plus a **Review answers** list that stays collapsed until you open it. It covers all question types and feedback modes, including mock exams.

Each entry in the list shows the question, your answer, the correct answer and any option text. Skipped questions are marked as such. Incorrect answers also get the explanation area (see section 6).

### Exam stats

- Accuracy by category over recent attempts, weakest first, each linking to a quiz on that category.
- Exam date and countdown.
- Coverage of the question bank.
- A readiness estimate compared with the pass mark, labelled as an estimate. Calculated from recent category accuracy, weighted by category weight where set, with unseen categories counting as zero.
- Quiz history, with dates, scores and trend.

### Mock exam (late v1 stage)

Uses the exam's question count, time limit and pass mark, with multiple choice questions only. Timer, no feedback until the end, and questions can be marked to come back to. Ends in pass/fail plus the usual results. Answered questions feed normal tracking. Unanswered ones score as wrong but aren't logged as attempts.

### Manage

Create, edit and delete subjects, exams, categories, sources, Chapters and questions, including answer keys. Includes the flagged list and source ratings. Editing a question keeps its history. Correcting an answer key re-marks past attempts against the new key, using the selections stored with them, and recalculates difficulty and progress. Reveals remain misses.

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

Both routes below end in the same **canonical JSON format**, validated by one shared Zod schema (`src/shared/question-bank.ts`). `docs/question-bank.schema.json` is generated from it and is the copy to share with an LLM, and `docs/question-bank.example.json` shows a mock bank. One file holds one source.

**Route A, built first:**

- **JSON upload** in the app, with a validation report and preview.
- A **Claude Code skill** that converts a document into that JSON, or generates new questions outside the app, using your Claude Code plan rather than API credits.

The format covers all three question types from the start, including free-form questions with their model answers and multiple choice questions with their per-answer text. The skill keeps any per-answer text in the source, and can optionally write what's missing, which avoids API costs later.

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
| Explanations | Question, all options, which are correct, plus web search | `claude-opus-5-5` (your choice) |

Models are set per feature in one config module, so changing one is a one-line edit. At current list prices, per million input/output tokens, Haiku 5.5 is $0.10 / $0.50, Sonnet 5.5 is $2 / $10 and Opus 5.5 is $4 / $20.

**No automatic API calls.** Claude is only called after a deliberate action on a clearly labelled control: Generate explanation, Generate new explanation, Submit for judging, Judge N free-form answers, Generate questions or Process document. Nothing runs in the background or on page load, and showing a saved explanation makes no API call.

Implementation notes:

- Use `@anthropic-ai/sdk` on the server only, with the API key in a git-ignored `.env`.
- Use structured outputs with Zod validation for generation, extraction, judging and explanations. Stage 10 needs to confirm this combines cleanly with web search.
- Log token usage for every call in `ai_calls`, visible in the data inspector.

**Generation form:** exam, categories, count, target difficulty, format (multiple choice or free-form), and optional reference material (pasted or uploaded). The exam's stored description and syllabus are included as context. The target source defaults to **Generated**, can be renamed in place, and can be swapped for any existing source. The Chapter defaults to a dated batch label, such as "Batch 2026-11-04", and can be edited. Generated multiple choice questions include per-answer text for every option. Results always go to the draft review screen before saving.

**Explanations:** at most one generated explanation per question, and it doesn't depend on which answer you chose. One API call writes the per-answer text for every option on the question at once (2-5 answers), which keeps token use down.

The explanation area appears after an incorrect or revealed answer, and in the Review answers list:

- **All options already have text from the bank:** that text is shown, with no button. It can be corrected in Manage.
- **Some or all text is missing:** a **Generate explanation** button appears. The call fills in only the missing options, and existing bank text is never overwritten.
- **Generated text already exists:** it's shown with no API call, plus a **Generate new explanation** button that replaces the generated text only.

Other rules:

- Generated text is stored on the options, so it then behaves like bank text everywhere, including on later attempts and for correct answers.
- After a reveal, only the correct answer's text shows, unless you press a generate button, which then shows them all.
- Text edited by hand in Manage counts as `source`, so it's protected from replacement.
- A free-form question has no options, so it stores one explanation on the question, covering the model answer and key points.
- Claude uses the web search tool to check its text against current sources, favouring official documentation, and the sources are shown with it. Searches per explanation are capped, and they're billed on top of tokens.
- This logic lives in one module, because this behaviour may be revisited.

## 7. Permissions

- Roles are `admin`, `editor` and `learner`. Admin and editor can both do full content editing.
- In v1, middleware always resolves to the seeded admin. Real login later replaces only that middleware.
- Every content-changing route checks its role on the server, and the UI hides controls you can't use.

## 8. Developer views

Available from a footer link, for admin only.

- **Data inspector (`/dev/data`):** every table in simple read-only form, with sorting, paging and refresh, so you can confirm that each action wrote what it should.
- **Component gallery (`/dev/components`):** the theme tokens and every component in all of its states on one page, using static sample content.
- **Theme:** fonts, colours, type, spacing and radii are CSS variable tokens mapped into Tailwind, so one change applies everywhere. Each look is a saved file in `src/client/themes/`, and one line in `src/client/theme.css` chooses which is active, so new looks can be tried and reverted. The tokens leave room for a dark mode later.

## 9. Technical notes

Follows `stack.md`, including its CLAUDE.md rules.

- **Location:** the repo lives in `C:\Projects`, outside OneDrive, because syncing a live SQLite database can lock or corrupt it.
- **Databases:** `npm run dev` uses `data/dev/quiz.db` and `npm start` uses `data/quiz.db`, so test data can't mix with real study progress.
- **Git-ignored data:** the database, question bank data and source documents are never committed. `.gitignore` covers `data/` and `.env` from Stage 1, and imported files are kept under `data/`.
- **Responsive layout** from the start, so v2 on a phone needs little rework.
- **Automated tests** are part of every stage. Logic and API tests cover difficulty, selection and live counts, scoring (including extra options on multi-answer questions), progress and attempt recording, with a few end-to-end tests of core flows. Claude calls are mocked.

## 10. Risks

- **Copyrighted content:** study guide questions are for personal use, which is another reason to keep them out of git. They would need removing or restricting before any public sharing.
- **Wrong answers in AI output:** generated and extracted questions can be wrong, which could teach you incorrect facts. Draft review, reference material and flagging reduce this but don't eliminate it.

## 11. To revisit

- **Prioritise:** it isn't clear from the UI what this option does. Revisit its wording and presentation, at the latest in Stage 7.
- **Styling:** spacing and readability, starting at the Stage 2 review. `preview/index.html` is a guide to structure only.
