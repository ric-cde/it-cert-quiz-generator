import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import type { ReviewEntry, ReviewOutcome } from '../../shared/quiz'
import type { Db } from '../db'
import { chapters, options, questions, sources } from '../db/schema'
import { attemptsIn, categoriesOf, findQuiz, inQuizOrder, liveQuestionIds, type QuizFailure } from './common'

/**
 * The Review answers list for a finished quiz: every question that counts towards the score, in
 * the order asked, with the options in the order they were shown.
 */
export function reviewQuiz(db: Db, userId: number, quizId: number): ReviewEntry[] | QuizFailure {
  return db.transaction((tx) => {
    const quiz = findQuiz(tx, userId, quizId)
    if (!quiz) return 'not-found'
    if (!quiz.finishedAt) return 'conflict'

    const history = new Map(attemptsIn(tx, quiz.id).map((attempt) => [attempt.questionId, attempt]))
    const live = liveQuestionIds(tx, quiz.questionIds)
    const asked = quiz.questionIds
      .map((id, index) => ({ id, number: index + 1, attempt: history.get(id) }))
      .filter(({ id, number, attempt }) => attempt !== undefined || (live.has(id) && number - 1 < quiz.position))
    const ids = asked.map(({ id }) => id)
    if (ids.length === 0) return []

    const names = categoriesOf(tx, ids)
    const rows = new Map(
      tx
        .select({ question: questions, source: sources.name })
        .from(questions)
        .innerJoin(chapters, eq(questions.chapterId, chapters.id))
        .innerJoin(sources, eq(chapters.sourceId, sources.id))
        .where(inArray(questions.id, ids))
        .all()
        .map((row) => [row.question.id, row]),
    )
    const optionRows = tx
      .select()
      .from(options)
      .where(and(inArray(options.questionId, ids), isNull(options.deletedAt)))
      .orderBy(asc(options.position))
      .all()

    return asked.flatMap(({ id, number, attempt }): ReviewEntry[] => {
      const row = rows.get(id)
      if (!row || row.question.type === 'free_form') return []
      const { question } = row
      const own = optionRows.filter((option) => option.questionId === id)
      const ordered = inQuizOrder(quiz, question, own)
      const chosen = new Set(attempt?.selectedOptionIds ?? [])
      const outcome: ReviewOutcome = !attempt
        ? 'skipped'
        : attempt.kind === 'revealed'
          ? 'revealed'
          : attempt.result === 'correct'
            ? 'correct'
            : 'incorrect'
      return [
        {
          number,
          questionId: id,
          type: question.type as ReviewEntry['type'],
          bodyMd: question.bodyMd,
          source: row.source,
          category: names.get(id)?.full ?? '',
          outcome,
          options: ordered.map((option) => ({
            id: option.id,
            label: option.label,
            bodyMd: option.bodyMd,
            isCorrect: option.isCorrect,
            chosen: chosen.has(option.id),
            explanationMd: option.explanationMd,
          })),
          explanationMd: question.explanationMd,
          reviewNote: question.reviewNote !== null && question.reviewedAt === null ? question.reviewNote : null,
        },
      ]
    })
  })
}
