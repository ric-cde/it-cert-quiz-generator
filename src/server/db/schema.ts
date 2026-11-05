import { sql } from 'drizzle-orm'
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import {
  AI_PURPOSES,
  ATTEMPT_KINDS,
  ATTEMPT_RESULTS,
  DRAFT_KINDS,
  DRAFT_STATUSES,
  EXPLANATION_ORIGINS,
  type ExplanationSource,
  type PriorityWeights,
  QUESTION_TYPES,
  type QuizConfig,
  QUIZ_MODES,
  type QuizDefaults,
  ROLES,
  SOURCE_ORIGINS,
  SOURCE_TRUST,
} from '../../shared/domain'

const id = () => integer('id').primaryKey({ autoIncrement: true })
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' })
const createdAt = () =>
  timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date())
const bool = (name: string) => integer(name, { mode: 'boolean' })

/* ---------- People ---------- */

export const users = sqliteTable('users', {
  id: id(),
  name: text('name').notNull(),
  role: text('role', { enum: ROLES }).notNull(),
})

/* ---------- Subject > Exam > Category > Source > Chapter ---------- */

export const subjects = sqliteTable('subjects', {
  id: id(),
  name: text('name').notNull().unique(),
})

export const exams = sqliteTable(
  'exams',
  {
    id: id(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    name: text('name').notNull(),
    // What the exam covers, as context when generating questions. Blank until filled in.
    descriptionMd: text('description_md'),
    syllabusMd: text('syllabus_md'),
    // Blank until known. Stage 12's mock exam needs all three.
    mockQuestionCount: integer('mock_question_count'),
    mockTimeLimitMin: integer('mock_time_limit_min'),
    passMarkPct: integer('pass_mark_pct'),
  },
  (t) => [
    uniqueIndex('exams_subject_name_unique').on(t.subjectId, t.name),
    check('exams_pass_mark_range', sql`${t.passMarkPct} BETWEEN 0 AND 100`),
  ],
)

export const userExams = sqliteTable(
  'user_exams',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    examId: integer('exam_id')
      .notNull()
      .references(() => exams.id),
    // A calendar date, YYYY-MM-DD, with no time zone to go wrong. Blank until booked.
    examDate: text('exam_date'),
    // Set when the user marks the real exam as passed.
    passedAt: timestamp('passed_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.examId] })],
)

/**
 * Two levels: a category, or a topic within one when `parentId` is set. Questions can belong to
 * either, and stats roll topics up into their category. Official ones come from the exam's own
 * objectives. Unofficial ones are added on import, when a file uses a name the exam doesn't have.
 */
export const categories = sqliteTable(
  'categories',
  {
    id: id(),
    examId: integer('exam_id')
      .notNull()
      .references(() => exams.id),
    parentId: integer('parent_id').references((): AnySQLiteColumn => categories.id),
    name: text('name').notNull(),
    weight: real('weight'),
    official: bool('official').notNull().default(true),
  },
  (t) => [uniqueIndex('categories_exam_name_unique').on(t.examId, t.name)],
)

/** A category name used in a file, and where the user chose to put its questions. Used again next time. */
export const categoryAliases = sqliteTable(
  'category_aliases',
  {
    id: id(),
    examId: integer('exam_id')
      .notNull()
      .references(() => exams.id),
    name: text('name').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
  },
  (t) => [uniqueIndex('category_aliases_exam_name_unique').on(t.examId, t.name)],
)

export const sources = sqliteTable(
  'sources',
  {
    id: id(),
    examId: integer('exam_id')
      .notNull()
      .references(() => exams.id),
    name: text('name').notNull(),
    rating: integer('rating'),
    origin: text('origin', { enum: SOURCE_ORIGINS }).notNull(),
    trust: text('trust', { enum: SOURCE_TRUST }),
    // A link or citation: a URL, a book and edition, or where and when it was found.
    reference: text('reference'),
  },
  (t) => [
    uniqueIndex('sources_exam_name_unique').on(t.examId, t.name),
    check('sources_rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
  ],
)

export const chapters = sqliteTable(
  'chapters',
  {
    id: id(),
    sourceId: integer('source_id')
      .notNull()
      .references(() => sources.id),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('chapters_source_name_unique').on(t.sourceId, t.name)],
)

/* ---------- Questions ---------- */

export const questions = sqliteTable(
  'questions',
  {
    id: id(),
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    type: text('type', { enum: QUESTION_TYPES }).notNull(),
    bodyMd: text('body_md').notNull(),
    modelAnswerMd: text('model_answer_md'),
    // Multiple choice only: one explanation for the whole question, alongside any per-option text.
    explanationMd: text('explanation_md'),
    explanationOrigin: text('explanation_origin', { enum: EXPLANATION_ORIGINS }),
    lockOptionOrder: bool('lock_option_order').notNull().default(false),
    externalId: text('external_id'),
    contentHash: text('content_hash').notNull(),
    // A doubt raised when the question was written or imported. It stays in quizzes with a warning.
    reviewNote: text('review_note'),
    reviewedAt: timestamp('reviewed_at'),
    flaggedAt: timestamp('flagged_at'),
    flagReason: text('flag_reason'),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('questions_chapter').on(t.chapterId),
    index('questions_category').on(t.categoryId),
    index('questions_external_id').on(t.externalId),
    index('questions_content_hash').on(t.contentHash),
  ],
)

export const options = sqliteTable(
  'options',
  {
    id: id(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id),
    bodyMd: text('body_md').notNull(),
    explanationMd: text('explanation_md'),
    explanationOrigin: text('explanation_origin', { enum: EXPLANATION_ORIGINS }),
    isCorrect: bool('is_correct').notNull(),
    position: integer('position').notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [index('options_question').on(t.questionId)],
)

/** Free-form questions only. Multiple choice explanations are stored on their options. */
export const explanations = sqliteTable('explanations', {
  id: id(),
  questionId: integer('question_id')
    .notNull()
    .unique()
    .references(() => questions.id),
  bodyMd: text('body_md').notNull(),
  sources: text('sources', { mode: 'json' }).$type<ExplanationSource[]>().notNull(),
  model: text('model').notNull(),
  createdAt: createdAt(),
})

/* ---------- Taking quizzes ---------- */

export const quizzes = sqliteTable(
  'quizzes',
  {
    id: id(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    examId: integer('exam_id')
      .notNull()
      .references(() => exams.id),
    mode: text('mode', { enum: QUIZ_MODES }).notNull(),
    config: text('config', { mode: 'json' }).$type<QuizConfig>().notNull(),
    questionIds: text('question_ids', { mode: 'json' }).$type<number[]>().notNull(),
    position: integer('position').notNull().default(0),
    startedAt: timestamp('started_at')
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: timestamp('finished_at'),
  },
  (t) => [index('quizzes_user_exam').on(t.userId, t.examId)],
)

/** The source of truth for a user's history. `question_stats` can be rebuilt from this. */
export const attempts = sqliteTable(
  'attempts',
  {
    id: id(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id),
    quizId: integer('quiz_id')
      .notNull()
      .references(() => quizzes.id),
    selectedOptionIds: text('selected_option_ids', { mode: 'json' }).$type<number[]>().notNull(),
    responseText: text('response_text'),
    result: text('result', { enum: ATTEMPT_RESULTS }).notNull(),
    kind: text('kind', { enum: ATTEMPT_KINDS }).notNull(),
    feedbackMd: text('feedback_md'),
    durationMs: integer('duration_ms'),
    createdAt: createdAt(),
  },
  (t) => [
    index('attempts_user_question').on(t.userId, t.questionId),
    // One try per question per quiz. Trying again means a new quiz, such as Retry missed.
    uniqueIndex('attempts_quiz_question_unique').on(t.quizId, t.questionId),
  ],
)

export const questionStats = sqliteTable(
  'question_stats',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id),
    difficulty: integer('difficulty'),
    attemptCount: integer('attempt_count').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
    streak: integer('streak').notNull().default(0),
    latestCorrect: bool('latest_correct').notNull().default(false),
    everCorrect: bool('ever_correct').notNull().default(false),
    lastSeenAt: timestamp('last_seen_at'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.questionId] }),
    check('question_stats_difficulty_range', sql`${t.difficulty} BETWEEN 0 AND 10`),
  ],
)

/* ---------- Claude and settings ---------- */

export const drafts = sqliteTable('drafts', {
  id: id(),
  examId: integer('exam_id')
    .notNull()
    .references(() => exams.id),
  kind: text('kind', { enum: DRAFT_KINDS }).notNull(),
  status: text('status', { enum: DRAFT_STATUSES }).notNull(),
  input: text('input', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  draftJson: text('draft_json', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: createdAt(),
})

export const aiCalls = sqliteTable('ai_calls', {
  id: id(),
  purpose: text('purpose', { enum: AI_PURPOSES }).notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  createdAt: createdAt(),
})

export const settings = sqliteTable('settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id),
  priorityWeights: text('priority_weights', { mode: 'json' }).$type<PriorityWeights>().notNull(),
  quizDefaults: text('quiz_defaults', { mode: 'json' }).$type<QuizDefaults>().notNull(),
  syntaxHighlighting: bool('syntax_highlighting').notNull().default(true),
})
