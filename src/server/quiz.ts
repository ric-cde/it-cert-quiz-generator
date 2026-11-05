import { and, asc, count, desc, eq, inArray, isNull, ne, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { Feedback } from '../shared/domain'
import type { QuizQuestion, QuizResults, QuizStartOptions, QuizState } from '../shared/quiz'
import type { Db, Tx } from './db'
import { attempts, categories, chapters, exams, options, questions, quizzes, sources } from './db/schema'
import { correctOptionIds, isExactMatch, recordAttempt } from './tracking'

type QuizRow = typeof quizzes.$inferSelect
type AttemptRow = typeof attempts.$inferSelect
type Reader = Pick<Tx, 'select'>

export type QuizFailure = 'not-found' | 'conflict' | 'invalid'
export type QuizOutcome = { ok: true; state: QuizState } | { ok: false; error: QuizFailure }

/* ---------- Choosing questions ---------- */

/**
 * What can appear in a quiz. Free-form questions wait for Stage 11, and Stage 6 grows this into the
 * shared selection function behind the live count.
 */
const selectable = (sourceId: number): SQL =>
  and(
    eq(chapters.sourceId, sourceId),
    isNull(questions.deletedAt),
    isNull(questions.flaggedAt),
    ne(questions.type, 'free_form'),
  )!

function countSelectable(db: Reader, sourceId: number) {
  return db
    .select({ value: count() })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(selectable(sourceId))
    .get()!.value
}

/** A small repeatable generator, so the same seed always gives the same order. */
function seededRandom(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  return () => {
    hash = (hash + 0x6d2b79f5) | 0
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export function createQuiz(
  db: Db,
  userId: number,
  { sourceId, feedback, limit }: { sourceId: number; feedback: Feedback; limit?: number },
): { ok: true; id: number } | { ok: false; error: 'not-found' | 'conflict' } {
  return db.transaction((tx) => {
    const source = tx.select().from(sources).where(eq(sources.id, sourceId)).get()
    if (!source) return { ok: false, error: 'not-found' }

    const ids = tx
      .select({ id: questions.id })
      .from(questions)
      .innerJoin(chapters, eq(questions.chapterId, chapters.id))
      .where(selectable(sourceId))
      .all()
      .map((question) => question.id)
    // Nothing to ask, such as a source of only flagged questions.
    if (ids.length === 0) return { ok: false, error: 'conflict' }

    const quiz = tx
      .insert(quizzes)
      .values({
        userId,
        examId: source.examId,
        mode: 'study',
        config: { feedback, sourceId },
        questionIds: shuffled(ids).slice(0, limit),
      })
      .returning()
      .get()
    return { ok: true, id: quiz.id }
  })
}

export function listStartOptions(db: Db, userId: number): QuizStartOptions {
  const sourceRows = db
    .select({ id: sources.id, exam: exams.name, name: sources.name })
    .from(sources)
    .innerJoin(exams, eq(sources.examId, exams.id))
    .orderBy(asc(exams.id), asc(sources.name))
    .all()
  const unfinished = db
    .select({ quiz: quizzes, exam: exams.name })
    .from(quizzes)
    .innerJoin(exams, eq(quizzes.examId, exams.id))
    .where(and(eq(quizzes.userId, userId), isNull(quizzes.finishedAt)))
    .orderBy(desc(quizzes.id))
    .all()

  return {
    sources: sourceRows.map((source) => ({ ...source, available: countSelectable(db, source.id) })),
    unfinished: unfinished.map(({ quiz, exam }) => ({
      id: quiz.id,
      exam,
      source: sourceRows.find((source) => source.id === quiz.config.sourceId)?.name ?? 'Removed source',
      feedback: quiz.config.feedback,
      position: quiz.position,
      total: quiz.questionIds.length,
    })),
  }
}

/* ---------- Reading a quiz ---------- */

const findQuiz = (db: Reader, userId: number, quizId: number) =>
  db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .get()

const attemptsIn = (db: Reader, quizId: number) => db.select().from(attempts).where(eq(attempts.quizId, quizId)).all()

/** Questions a quiz can still ask. A re-import can turn one into free-form, which waits for Stage 11. */
const liveQuestionIds = (db: Reader, ids: number[]) =>
  new Set(
    ids.length
      ? db
          .select({ id: questions.id })
          .from(questions)
          .where(and(inArray(questions.id, ids), isNull(questions.deletedAt), ne(questions.type, 'free_form')))
          .all()
          .map((question) => question.id)
      : [],
  )

/** Steps over questions removed since the quiz began, and finishes the quiz if none are left. */
function settle(tx: Tx, quiz: QuizRow): QuizRow {
  if (quiz.finishedAt) return quiz
  const live = liveQuestionIds(tx, quiz.questionIds)

  let position = quiz.position
  while (position < quiz.questionIds.length && !live.has(quiz.questionIds[position]!)) position += 1

  const finishedAt = position >= quiz.questionIds.length ? new Date() : null
  if (position === quiz.position && !finishedAt) return quiz
  return tx.update(quizzes).set({ position, finishedAt }).where(eq(quizzes.id, quiz.id)).returning().get()
}

function resultsOf(quiz: QuizRow, history: AttemptRow[], live: Set<number>): QuizResults {
  const byQuestion = new Map(history.map((attempt) => [attempt.questionId, attempt]))
  const results: QuizResults = { correct: 0, incorrect: 0, revealed: 0, skipped: 0, notReached: 0 }
  quiz.questionIds.forEach((id, index) => {
    const attempt = byQuestion.get(id)
    if (attempt) {
      if (attempt.kind === 'revealed') results.revealed += 1
      else if (attempt.result === 'correct') results.correct += 1
      else results.incorrect += 1
    } else if (live.has(id)) {
      if (index < quiz.position) results.skipped += 1
      else results.notReached += 1
    }
  })
  return results
}

const parentCategories = alias(categories, 'parent_categories')

function currentQuestion(db: Reader, quiz: QuizRow, questionId: number, attempt: AttemptRow | undefined): QuizQuestion {
  const row = db
    .select({ question: questions, source: sources.name, category: categories.name, parent: parentCategories.name })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(sources, eq(chapters.sourceId, sources.id))
    .innerJoin(categories, eq(questions.categoryId, categories.id))
    .leftJoin(parentCategories, eq(categories.parentId, parentCategories.id))
    .where(eq(questions.id, questionId))
    .get()!
  const { question } = row

  const rows = db
    .select()
    .from(options)
    .where(and(eq(options.questionId, questionId), isNull(options.deletedAt)))
    .orderBy(asc(options.position))
    .all()
  // Seeded by quiz and question, so resuming shows the same order and the number keys still match.
  const ordered = question.lockOptionOrder ? rows : shuffled(rows, seededRandom(`${quiz.id}:${questionId}`))

  const locked = attempt !== undefined && quiz.config.feedback === 'after_each'
  const revealed = attempt?.kind === 'revealed'
  const inDoubt = question.reviewNote !== null && question.reviewedAt === null

  return {
    id: question.id,
    // Free-form questions can't reach here until Stage 11, because `selectable` leaves them out.
    type: question.type as QuizQuestion['type'],
    bodyMd: question.bodyMd,
    source: row.source,
    flag: question.flaggedAt ? { reason: question.flagReason } : null,
    inDoubt,
    ...(locked && inDoubt ? { reviewNote: question.reviewNote! } : {}),
    ...(locked
      ? {
          category: row.parent ? `${row.parent} › ${row.category}` : row.category,
          explanationMd: question.explanationMd,
        }
      : {}),
    outcome: locked
      ? {
          result: attempt.result === 'correct' ? 'correct' : 'incorrect',
          kind: attempt.kind,
          selectedOptionIds: attempt.selectedOptionIds,
        }
      : null,
    options: ordered.map((option) =>
      locked
        ? {
            id: option.id,
            bodyMd: option.bodyMd,
            isCorrect: option.isCorrect,
            // After a reveal only the correct answer's text shows.
            explanationMd: revealed && !option.isCorrect ? null : option.explanationMd,
          }
        : { id: option.id, bodyMd: option.bodyMd },
    ),
  }
}

function buildState(db: Reader, quiz: QuizRow): QuizState {
  const exam = db.select({ name: exams.name }).from(exams).where(eq(exams.id, quiz.examId)).get()!
  const history = attemptsIn(db, quiz.id)
  const base = {
    id: quiz.id,
    exam: exam.name,
    feedback: quiz.config.feedback,
    total: quiz.questionIds.length,
    position: quiz.position,
  }
  if (quiz.finishedAt) {
    const results = resultsOf(quiz, history, liveQuestionIds(db, quiz.questionIds))
    return { ...base, finished: true, current: null, results }
  }
  const id = quiz.questionIds[quiz.position]!
  const attempt = history.find((item) => item.questionId === id)
  return { ...base, finished: false, current: currentQuestion(db, quiz, id, attempt), results: null }
}

export function getQuizState(db: Db, userId: number, quizId: number): QuizState | null {
  return db.transaction((tx) => {
    const quiz = findQuiz(tx, userId, quizId)
    return quiz ? buildState(tx, settle(tx, quiz)) : null
  })
}

/* ---------- Acting on a quiz ---------- */

/** Runs an action on the question the quiz is on now. Anything else is out of date. */
function onCurrentQuestion(
  db: Db,
  userId: number,
  quizId: number,
  questionId: number,
  action: (tx: Tx, quiz: QuizRow, attempt: AttemptRow | undefined) => QuizRow | QuizFailure,
): QuizOutcome {
  return db.transaction((tx): QuizOutcome => {
    const found = findQuiz(tx, userId, quizId)
    if (!found) return { ok: false, error: 'not-found' }
    const quiz = settle(tx, found)
    if (quiz.finishedAt || quiz.questionIds[quiz.position] !== questionId) return { ok: false, error: 'conflict' }

    const attempt = attemptsIn(tx, quiz.id).find((item) => item.questionId === questionId)
    const result = action(tx, quiz, attempt)
    if (typeof result === 'string') return { ok: false, error: result }
    return { ok: true, state: buildState(tx, settle(tx, result)) }
  })
}

function moveOn(tx: Tx, quiz: QuizRow) {
  const position = quiz.position + 1
  return tx
    .update(quizzes)
    .set({ position, finishedAt: position >= quiz.questionIds.length ? new Date() : null })
    .where(eq(quizzes.id, quiz.id))
    .returning()
    .get()
}

export function answerQuestion(
  db: Db,
  userId: number,
  quizId: number,
  body: { questionId: number; selectedOptionIds: number[]; durationMs?: number },
): QuizOutcome {
  const { questionId, selectedOptionIds, durationMs } = body
  return onCurrentQuestion(db, userId, quizId, questionId, (tx, quiz, attempt) => {
    // A second press of Submit. There's one try, so the first answer stands.
    if (attempt) return quiz

    const question = tx.select({ type: questions.type }).from(questions).where(eq(questions.id, questionId)).get()!
    const live = tx
      .select({ id: options.id })
      .from(options)
      .where(and(eq(options.questionId, questionId), isNull(options.deletedAt)))
      .all()
      .map((option) => option.id)
    const chosen = new Set(selectedOptionIds)
    const fits =
      question.type !== 'free_form' &&
      chosen.size === selectedOptionIds.length &&
      selectedOptionIds.every((id) => live.includes(id)) &&
      (question.type !== 'single' || chosen.size === 1)
    if (!fits) return 'invalid'

    recordAttempt(tx, {
      userId,
      questionId,
      quizId,
      selectedOptionIds,
      result: isExactMatch(selectedOptionIds, correctOptionIds(tx, questionId)) ? 'correct' : 'incorrect',
      kind: 'answered',
      durationMs,
    })
    // At-the-end feedback locks the answer and moves on, showing nothing about it.
    return quiz.config.feedback === 'at_end' ? moveOn(tx, quiz) : quiz
  })
}

export function revealAnswer(
  db: Db,
  userId: number,
  quizId: number,
  { questionId, durationMs }: { questionId: number; durationMs?: number },
): QuizOutcome {
  return onCurrentQuestion(db, userId, quizId, questionId, (tx, quiz, attempt) => {
    if (quiz.config.feedback !== 'after_each') return 'invalid'
    if (attempt) return quiz
    recordAttempt(tx, {
      userId,
      questionId,
      quizId,
      selectedOptionIds: [],
      result: 'incorrect',
      kind: 'revealed',
      durationMs,
    })
    return quiz
  })
}

/**
 * Moves on from a question. At-the-end feedback can skip one with no attempt logged. After-each
 * feedback needs it answered first, unless it was flagged as too broken to answer.
 */
export function nextQuestion(db: Db, userId: number, quizId: number, questionId: number): QuizOutcome {
  return onCurrentQuestion(db, userId, quizId, questionId, (tx, quiz, attempt) => {
    if (quiz.config.feedback === 'after_each' && !attempt) {
      const question = tx.select({ flaggedAt: questions.flaggedAt }).from(questions).where(eq(questions.id, questionId)).get()
      if (!question?.flaggedAt) return 'conflict'
    }
    return moveOn(tx, quiz)
  })
}

/** Ends a quiz, early or not. Answers already saved all stand. */
export function finishQuiz(db: Db, userId: number, quizId: number): QuizOutcome {
  return db.transaction((tx): QuizOutcome => {
    const found = findQuiz(tx, userId, quizId)
    if (!found) return { ok: false, error: 'not-found' }
    const quiz = found.finishedAt
      ? found
      : tx.update(quizzes).set({ finishedAt: new Date() }).where(eq(quizzes.id, found.id)).returning().get()
    return { ok: true, state: buildState(tx, quiz) }
  })
}

/* ---------- Flagging ---------- */

/** Flagging keeps the first date. Without a reason, any reason already given stays. */
export function flagQuestion(db: Db, questionId: number, reason?: string) {
  const question = db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), isNull(questions.deletedAt)))
    .get()
  if (!question) return false
  db.update(questions)
    .set({
      flaggedAt: question.flaggedAt ?? new Date(),
      flagReason: reason === undefined ? question.flagReason : reason || null,
    })
    .where(eq(questions.id, questionId))
    .run()
  return true
}

export function unflagQuestion(db: Db, questionId: number) {
  return db.update(questions).set({ flaggedAt: null, flagReason: null }).where(eq(questions.id, questionId)).run().changes > 0
}
