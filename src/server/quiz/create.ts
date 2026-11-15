import { eq } from 'drizzle-orm'
import { selectQuestions } from '../../shared/practice'
import type { CreateQuizBody } from '../../shared/quiz'
import type { Db } from '../db'
import { exams, quizzes, sources } from '../db/schema'
import { describeSelection, loadPool } from '../selection'
import { getSettings } from '../settings'
import { askableIds, attemptsIn, findQuiz, missedIds, type QuizFailure, type QuizRow, type Reader } from './common'
import { shuffled } from './random'

/** Starts a quiz from the take-exam screen, using the same selection as the live count. */
export function createQuiz(
  db: Db,
  userId: number,
  { examId, feedback, limit, sort, ...selection }: CreateQuizBody,
): { ok: true; id: number } | { ok: false; error: 'not-found' | 'conflict' } {
  const { optionOrder } = getSettings(db, userId)
  return db.transaction((tx) => {
    const exam = tx.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get()
    if (!exam) return { ok: false, error: 'not-found' }

    const ids = selectQuestions(loadPool(tx, userId, examId), selection)
    // Nothing to ask, such as a status filter that nothing passes.
    if (ids.length === 0) return { ok: false, error: 'conflict' }

    const quiz = tx
      .insert(quizzes)
      .values({
        userId,
        examId,
        mode: 'study',
        config: { feedback, selection, sort, optionOrder, ...(limit ? { limit } : {}) },
        questionIds: (sort === 'source' ? ids : shuffled(ids)).slice(0, limit),
      })
      .returning()
      .get()
    return { ok: true, id: quiz.id }
  })
}

/** Starts a new quiz of the questions missed in a finished one, with the same feedback. */
export function retryMissed(
  db: Db,
  userId: number,
  quizId: number,
): { ok: true; id: number } | { ok: false; error: QuizFailure } {
  const { optionOrder } = getSettings(db, userId)
  return db.transaction((tx) => {
    const quiz = findQuiz(tx, userId, quizId)
    if (!quiz) return { ok: false, error: 'not-found' }
    if (!quiz.finishedAt) return { ok: false, error: 'conflict' }

    const askable = askableIds(tx, quiz.questionIds)
    const ids = missedIds(quiz, attemptsIn(tx, quiz.id)).filter((id) => askable.has(id))
    if (ids.length === 0) return { ok: false, error: 'conflict' }

    const created = tx
      .insert(quizzes)
      .values({
        userId,
        examId: quiz.examId,
        mode: 'study',
        config: { feedback: quiz.config.feedback, retryOf: quiz.id, optionOrder },
        questionIds: shuffled(ids),
      })
      .returning()
      .get()
    return { ok: true, id: created.id }
  })
}

/**
 * A quiz's name, worked out when it's shown so every quiz follows the current naming rules. A
 * retry is named after the quiz it retries, and Stage 5 quizzes after their source.
 */
export function labelOf(db: Reader, quiz: QuizRow): string {
  if (quiz.config.selection) return describeSelection(db, quiz.config.selection)
  if (quiz.config.retryOf) {
    const original = findQuiz(db, quiz.userId, quiz.config.retryOf)
    return `Retry missed: ${original ? labelOf(db, original) : 'Quiz'}`
  }
  if (quiz.config.label) return quiz.config.label
  const source = quiz.config.sourceId
    ? db.select({ name: sources.name }).from(sources).where(eq(sources.id, quiz.config.sourceId)).get()
    : undefined
  return source?.name ?? 'Quiz'
}
