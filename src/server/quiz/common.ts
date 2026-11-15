import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { QuizState } from '../../shared/quiz'
import type { Tx } from '../db'
import { attempts, categories, questions, quizzes } from '../db/schema'
import { seededRandom, shuffled } from './random'

/** What every part of a quiz shares: its rows, finding them, and which questions it can still ask. */

export type QuizRow = typeof quizzes.$inferSelect
export type AttemptRow = typeof attempts.$inferSelect
export type Reader = Pick<Tx, 'select'>

export type QuizFailure = 'not-found' | 'conflict' | 'invalid'
export type QuizOutcome = { ok: true; state: QuizState } | { ok: false; error: QuizFailure }

export const findQuiz = (db: Reader, userId: number, quizId: number) =>
  db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .get()

export const attemptsIn = (db: Reader, quizId: number) =>
  db.select().from(attempts).where(eq(attempts.quizId, quizId)).all()

/**
 * Of these questions, the ones that can still be asked: not removed, and not free-form until
 * Stage 14 (a re-import can turn one into free-form). A quiz already under way still asks a
 * question flagged since it began, but a new quiz leaves flagged ones out.
 */
function stillAskable(db: Reader, ids: number[], { includeFlagged }: { includeFlagged: boolean }) {
  if (ids.length === 0) return new Set<number>()
  const rows = db
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(
        inArray(questions.id, ids),
        isNull(questions.deletedAt),
        ne(questions.type, 'free_form'),
        includeFlagged ? undefined : isNull(questions.flaggedAt),
      ),
    )
    .all()
  return new Set(rows.map((question) => question.id))
}

/** Questions that can go into a new quiz now, such as Retry missed. */
export const askableIds = (db: Reader, ids: number[]) => stillAskable(db, ids, { includeFlagged: false })

/** Questions a quiz already under way can still ask. */
export const liveQuestionIds = (db: Reader, ids: number[]) => stillAskable(db, ids, { includeFlagged: true })

/** What Retry missed asks again: incorrect, revealed and skipped questions, but not ones never reached. */
export function missedIds(quiz: QuizRow, history: AttemptRow[]) {
  const byQuestion = new Map(history.map((attempt) => [attempt.questionId, attempt]))
  return quiz.questionIds.filter((id, index) => {
    const attempt = byQuestion.get(id)
    return attempt ? attempt.result !== 'correct' : index < quiz.position
  })
}

/** Steps over questions removed since the quiz began, and finishes the quiz if none are left. */
export function settle(tx: Tx, quiz: QuizRow): QuizRow {
  if (quiz.finishedAt) return quiz
  const live = liveQuestionIds(tx, quiz.questionIds)

  let position = quiz.position
  while (position < quiz.questionIds.length && !live.has(quiz.questionIds[position]!)) position += 1

  const finishedAt = position >= quiz.questionIds.length ? new Date() : null
  if (position === quiz.position && !finishedAt) return quiz
  return tx.update(quizzes).set({ position, finishedAt }).where(eq(quizzes.id, quiz.id)).returning().get()
}

export const parentCategories = alias(categories, 'parent_categories')

/** A topic is shown with its category, such as "Data › Aggregates". */
export const categoryLabel = (category: string, parent: string | null) =>
  parent ? `${parent} › ${category}` : category

/**
 * Options in the order the quiz shows them, following the option order setting it began with.
 * Shuffling is seeded by quiz and question, so resuming and Review answers show the same order
 * and the number keys still match.
 */
export function inQuizOrder<T extends { label: string | null }>(
  quiz: Pick<QuizRow, 'id' | 'config'>,
  question: { id: number; lockOptionOrder: boolean },
  rows: T[],
): T[] {
  const order = quiz.config.optionOrder ?? 'shuffle'
  const keep =
    question.lockOptionOrder || order === 'source' || (order === 'labelled' && rows.some((row) => row.label !== null))
  return keep ? rows : shuffled(rows, seededRandom(`${quiz.id}:${question.id}`))
}

/** The category of each question, as its top-level name and as shown beside a question. */
export function categoriesOf(db: Reader, ids: number[]) {
  const rows = ids.length
    ? db
        .select({ id: questions.id, category: categories.name, parent: parentCategories.name })
        .from(questions)
        .innerJoin(categories, eq(questions.categoryId, categories.id))
        .leftJoin(parentCategories, eq(categories.parentId, parentCategories.id))
        .where(inArray(questions.id, ids))
        .all()
    : []
  return new Map(
    rows.map((row) => [row.id, { top: row.parent ?? row.category, full: categoryLabel(row.category, row.parent) }]),
  )
}
