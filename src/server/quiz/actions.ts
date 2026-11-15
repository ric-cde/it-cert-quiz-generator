import { and, eq, isNull } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { options, questions, quizzes } from '../db/schema'
import { correctOptionIds, isExactMatch, recordAttempt } from '../tracking'
import {
  attemptsIn,
  type AttemptRow,
  findQuiz,
  type QuizFailure,
  type QuizOutcome,
  type QuizRow,
  settle,
} from './common'
import { buildState } from './state'

/** Answering, revealing, moving on and ending. Each acts on the question the quiz is on now. */

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
      const question = tx
        .select({ flaggedAt: questions.flaggedAt })
        .from(questions)
        .where(eq(questions.id, questionId))
        .get()
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
