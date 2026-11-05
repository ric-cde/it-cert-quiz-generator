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
- Categories have two levels: an exam's **official categories** and their **official topics**, from its exam detail sheet or syllabus, each with an optional weight. A question can belong to a topic or directly to a category, and stats roll topics up into their category. **Unofficial categories** come from imported files that use a name the exam doesn't have. They're kept apart from the official ones, so readiness can still be weighed against the exam's own structure.
- **Chapter** is a chapter or any other grouping inside a Source, such as a practice set.
- Every question belongs to exactly one Chapter and one Category.

### Question types

| Type | Behaviour |
|---|---|
| Single answer | Radio options. |
| Multi-answer | Checkboxes for "choose two" / "all that apply". The UI doesn't limit how many you can tick. Scored all-or-nothing: correct only if the selection exactly matches the correct options, so the right options plus an extra one is incorrect. |
| Free-form | Text, multi-line or code answer with a stored model answer, judged by Claude Haiku. Stored in banks and mixed into quizzes like any other question. |

Question and option text is Markdown, including code blocks. Each option has optional **per-answer text**, and a multiple choice question can also have an optional **explanation of the whole question**, shown below the options after answering. A source's single "Answer: B, because..." goes there rather than onto one option. The UI shows only the text that exists, wherever it is. When a question you missed has none at all, one muted line says so, and Stage 10's Generate button goes there. For a wrong answer, this says why it's wrong in 1-3 sentences. For the correct answer, it says something like "Correct! Here's why" in 1-2 sentences. Ideally a bank comes with this text, and if it doesn't, Claude can write it (see section 6). Options are shuffled unless the question is marked `lockOptionOrder`, for example for "all of the above".

### Tables

| Table | Key fields |
|---|---|
| `users` | name, role (`admin` / `editor` / `learner`) |
| `subjects` | name |
| `exams` | subjectId, name, descriptionMd, syllabusMd, mockQuestionCount, mockTimeLimitMin, passMarkPct |
| `user_exams` | userId, examId, examDate, passedAt |
| `categories` | examId, parentId (set for a topic), name, weight (optional), official |
| `category_aliases` | examId, name, categoryId: a name from a file, and where the user chose to put it |
| `sources` | examId, name, rating (1-5, optional), origin (`upload` / `import` / `generated`), trust (`official` / `third_party` / `ai`, optional), reference (optional) |
| `chapters` | sourceId, name |
| `questions` | chapterId, categoryId, type, bodyMd, modelAnswerMd, explanationMd, explanationOrigin, lockOptionOrder, externalId, contentHash, reviewNote, reviewedAt, flaggedAt, flagReason, deletedAt |
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
- Each source can also say how far it can be trusted: **official** (the exam vendor's own material, the ground truth), **third-party**, or **AI-written**, plus a **reference** such as a URL or a book and edition. These come from the file, and generated sources count as AI-written unless it says otherwise.
- **Flag** any question as bad or wrong. Flagged questions are left out of quizzes and appear in a review list where you can fix or unflag them.
- **Doubts:** a question can arrive with a `reviewNote`, for example when a source's answer looks wrong. It stays in quizzes with a warning, and the note itself, which may give away the answer, shows only after answering. The import screen sends you to `/review`, where you can keep the question as it is, change its answer, or take it out of quizzes, which flags it.

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
- You can end a quiz early and go to results, after one confirmation. Answers already saved stand, and questions you never reached don't count against the score.
- Option order is fixed per quiz and question, so resuming shows the same order and the number keys still match. Each question can be attempted once per quiz.
- Nothing that could give the answer away, including a doubt's note and the question's category, leaves the server until the question is locked. The category then shows beside the question.
- **Flag** works in one press, with an optional reason and **Unflag**. In after-each feedback, a flagged question can be left without answering it, and no attempt is logged.

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
2. Pressing **Next** records your answer and locks it, and there is no going back. Pressing it with nothing selected skips the question, and no attempt is logged. A short note says so while nothing is selected.
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

- **Import screen (`/import`):** choose a JSON file and see a preview, with problems that block it, warnings that don't, what would be new, updated, unchanged or duplicated, and the questions rendered with their answers. Nothing is saved until you press Import. **Try the first 10 only** imports a trial, and importing the same file later adds the rest. The screen also lists sources and can delete one with no attempts, to clear out a trial.
- **A skill for the Claude apps** (`skill/creating-question-banks`, built into a zip by `npm run skill:build`) that produces that JSON using your Claude plan rather than API credits. It works for any exam the user names, and carries the app's exams only as a convenience. It runs the same checks as the import screen, because its validator is bundled from the same code. It finishes the whole file without stopping for a check, then shows 2-3 sample questions alongside it. Any feedback goes back to the same chat, which regenerates the file.

The skill has three modes:

| Mode | Input | Result |
|---|---|---|
| **A: Copy** | Existing questions (PDF, web page, and so on) | Copied exactly, in the form given, with only obvious errors corrected and listed in the report |
| **B: From material** | Exam prep information with no questions (syllabus, objectives, notes) | New questions based on that material |
| **C: From research** | Nothing uploaded | New questions from a rigorous web search, favouring official sources, with each correct answer linking to its evidence |

Modes B and C write multiple choice questions unless you specifically ask for free-form ones. In every mode, any answer text in the source is kept: text about one option on that option, and the rest on the question. Mode A writes no new text unless asked. Modes B and C write text for correct answers. Wrong answers stay blank unless asked, for the app to generate on request.

When an exam covers one version or platform, such as OutSystems 11 Reactive apps, questions about another one, such as older versions or Traditional Web apps, are kept with a short note in parentheses at the end of the question text, such as "(Traditional Web)".

The format covers all three question types from the start, including free-form questions with their model answers and multiple choice questions with their per-answer text.

**Route B, in-app pipeline, built later:**

1. Upload a PDF, CSV or Markdown file, or paste text or a URL.
2. The server prepares it. PDFs go to Claude directly, and web pages are fetched and reduced to readable text.
3. Claude structures it, assigns categories from the exam's list, and matches answers even when they're in a separate appendix. Long documents are processed in chunks, and nothing is silently truncated.
4. You check a **draft review screen**, where you can edit, discard or approve questions.
5. Approved questions are saved.

Rules for both routes:

- Images aren't supported, so questions that depend on one are left out of the bank and listed in the import report. This includes the image questions in the OutSystems practice exam.
- Duplicates (matching `contentHash` anywhere in the exam) are shown in review and skipped unless you choose to include them, and it's pointed out if two sources disagree on the answer.
- Re-importing with the same `externalId` updates the question and keeps its history, including its option IDs. `externalId` is recommended rather than required. Without one, a question is matched by its text within the source, so one whose wording changes counts as new.
- Questions the file doesn't mention are left alone.
- If an update changes the answer key, past answers are marked again, the same as a correction in Manage.
- A question with a `reviewNote` is how the skill raises a doubt, such as a source's answer that looks wrong, without silently changing it. See Quality in section 2.
- **The file wins.** Re-importing overwrites changes made in the app to that question's text, options and answers, including hand edits. The exceptions: a question deleted in the app stays deleted, and a flag stays. If the update changes the question, any doubt in the file opens for review again.
- **Source text is ground truth.** Explanation text from a source can replace anything. AI-written text only fills a blank or replaces other AI-written text, and the preview says where it was held back. A blank in a file never wipes existing text.
- **Categories:** the preview lists every category name in the file and whether it's an official category, an official topic, an unofficial one added before, or a name mapped before. For each new name you choose: put its questions into an existing category or topic, which merges them, or keep it as a new unofficial category. A name that matches an existing one apart from case is suggested. Choices are remembered, so the next file from that source imports the same way. Renaming and merging existing categories comes with Manage.

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

**Generation form:** exam, categories, count, target difficulty, format (multiple choice or free-form), and optional reference material (pasted or uploaded). The exam's stored description and syllabus are included as context. The target source defaults to **Generated**, can be renamed in place, and can be swapped for any existing source. The Chapter defaults to a dated batch label, such as "Batch 2026-11-04", and can be edited. Generated multiple choice questions include per-answer text for the correct options, and the rest can be generated on request, the same as the skill. Results always go to the draft review screen before saving.

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
