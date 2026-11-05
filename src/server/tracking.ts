import { and, asc, eq, isNull } from 'drizzle-orm'
import type { ATTEMPT_KINDS, ATTEMPT_RESULTS } from '../shared/domain'
import type { Tx } from './db'
import { attempts, options, questions, questionStats } from './db/schema'

/**
 * Scoring and tracking. `attempts` is the source of truth, and `question_stats` is always worked
 * out from it, here and nowhere else, so recording an attempt and rebuilding can't disagree.
 */

type AttemptResult = (typeof ATTEMPT_RESULTS)[number]
type AttemptKind = (typeof ATTEMPT_KINDS)[number]

export const MAX_DIFFICULTY = 10

/** Starts at 3 or 5, then moves one step at a time, staying within 0 to 10. */
export function nextDifficulty(current: number | null, wasCorrect: boolean) {
  if (current === null) return wasCorrect ? 3 : 5
  return wasCorrect ? Math.max(current - 1, 0) : Math.min(current + 1, MAX_DIFFICULTY)
}

/** All or nothing: the right options plus an extra one is wrong, and so is missing one. */
export function isExactMatch(selected: readonly number[], correct: readonly number[]) {
  const chosen = new Set(selected)
  return chosen.size === correct.length && correct.every((id) => chosen.has(id))
}

type StatsFields = {
  difficulty: number | null
  attemptCount: number
  correctCount: number
  streak: number
  latestCorrect: boolean
  everCorrect: boolean
  lastSeenAt: Date | null
}

/** Replays a question's attempts, oldest first. Pending attempts don't count until they're judged. */
export function statsFromAttempts(history: readonly { result: AttemptResult; createdAt: Date }[]): StatsFields {
  const stats: StatsFields = {
    difficulty: null,
    attemptCount: 0,
    correctCount: 0,
    streak: 0,
    latestCorrect: false,
    everCorrect: false,
    lastSeenAt: null,
  }
  for (const { result, createdAt } of history) {
    if (result === 'pending') continue
    const correct = result === 'correct'
    stats.difficulty = nextDifficulty(stats.difficulty, correct)
    stats.attemptCount += 1
    stats.correctCount += correct ? 1 : 0
    stats.streak = correct ? stats.streak + 1 : 0
    stats.latestCorrect = correct
    stats.everCorrect ||= correct
    stats.lastSeenAt = createdAt
  }
  return stats
}

export function rebuildStats(tx: Tx, userId: number, questionId: number) {
  const history = tx
    .select({ result: attempts.result, createdAt: attempts.createdAt })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.questionId, questionId)))
    .orderBy(asc(attempts.id))
    .all()
  const stats = statsFromAttempts(history)
  tx.insert(questionStats)
    .values({ userId, questionId, ...stats })
    .onConflictDoUpdate({ target: [questionStats.userId, questionStats.questionId], set: stats })
    .run()
}

export function recordAttempt(
  tx: Tx,
  attempt: {
    userId: number
    questionId: number
    quizId: number
    selectedOptionIds: number[]
    result: AttemptResult
    kind: AttemptKind
    durationMs?: number
  },
) {
  tx.insert(attempts).values(attempt).run()
  rebuildStats(tx, attempt.userId, attempt.questionId)
}

export function correctOptionIds(tx: Pick<Tx, 'select'>, questionId: number) {
  return tx
    .select({ id: options.id })
    .from(options)
    .where(and(eq(options.questionId, questionId), eq(options.isCorrect, true), isNull(options.deletedAt)))
    .all()
    .map((option) => option.id)
}

/**
 * After an answer key changes, marks past answers again using the selections stored with them, then
 * recalculates difficulty and progress. A reveal stays a miss, because nothing was answered.
 */
export function remarkQuestion(tx: Tx, questionId: number) {
  const question = tx.select({ type: questions.type }).from(questions).where(eq(questions.id, questionId)).get()
  if (!question || question.type === 'free_form') return

  const correct = correctOptionIds(tx, questionId)
  const history = tx.select().from(attempts).where(eq(attempts.questionId, questionId)).all()
  const users = new Set<number>()

  for (const attempt of history) {
    users.add(attempt.userId)
    if (attempt.kind !== 'answered' || attempt.selectedOptionIds.length === 0) continue
    const result = isExactMatch(attempt.selectedOptionIds, correct) ? 'correct' : 'incorrect'
    if (result !== attempt.result) tx.update(attempts).set({ result }).where(eq(attempts.id, attempt.id)).run()
  }
  for (const userId of users) rebuildStats(tx, userId, questionId)
}
