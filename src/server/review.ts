import { and, asc, count, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import type { QuestionToReview, ReviewDecision } from '../shared/review'
import type { Db } from './db'
import { chapters, exams, options, questions, sources } from './db/schema'
import { remarkQuestion } from './tracking'

const OPEN_REVIEW = and(isNotNull(questions.reviewNote), isNull(questions.reviewedAt), isNull(questions.deletedAt))

export function countToReview(db: Pick<Db, 'select'>, sourceId: number) {
  return db
    .select({ value: count() })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(and(eq(chapters.sourceId, sourceId), OPEN_REVIEW))
    .get()!.value
}

/** Questions with a doubt nobody has looked at yet, optionally for one source. */
export function listToReview(db: Db, sourceId?: number): QuestionToReview[] {
  const rows = db
    .select({ question: questions, chapter: chapters.name, source: sources.name, sourceId: sources.id, exam: exams.name })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(sources, eq(chapters.sourceId, sources.id))
    .innerJoin(exams, eq(sources.examId, exams.id))
    .where(sourceId === undefined ? OPEN_REVIEW : and(OPEN_REVIEW, eq(sources.id, sourceId)))
    .orderBy(asc(questions.id))
    .all()

  const ids = rows.map((row) => row.question.id)
  const optionRows = ids.length
    ? db
        .select()
        .from(options)
        .where(and(inArray(options.questionId, ids), isNull(options.deletedAt)))
        .orderBy(asc(options.position))
        .all()
    : []

  return rows.map(({ question, ...place }) => ({
    id: question.id,
    ...place,
    type: question.type,
    externalId: question.externalId,
    bodyMd: question.bodyMd,
    modelAnswerMd: question.modelAnswerMd,
    explanationMd: question.explanationMd,
    reviewNote: question.reviewNote!,
    options: optionRows
      .filter((option) => option.questionId === question.id)
      .map(({ id, bodyMd, isCorrect, explanationMd, explanationOrigin }) => ({
        id,
        bodyMd,
        isCorrect,
        explanationMd,
        explanationOrigin,
      })),
  }))
}

export type ReviewOutcome = 'done' | 'not-found' | 'invalid-answer'

/** Settles a doubt. The note stays on the question as a record, marked as reviewed. */
export function resolveReview(db: Db, questionId: number, decision: ReviewDecision): ReviewOutcome {
  return db.transaction((tx) => {
    const question = tx
      .select()
      .from(questions)
      .where(and(eq(questions.id, questionId), OPEN_REVIEW))
      .get()
    if (!question) return 'not-found'

    const now = new Date()
    if (decision.action === 'take-out') {
      tx.update(questions)
        .set({ reviewedAt: now, flaggedAt: now, flagReason: question.reviewNote })
        .where(eq(questions.id, questionId))
        .run()
      return 'done'
    }

    if (decision.action === 'change-answer') {
      const live = tx
        .select()
        .from(options)
        .where(and(eq(options.questionId, questionId), isNull(options.deletedAt)))
        .all()
      const chosen = new Set(decision.correctOptionIds)
      const known = live.filter((option) => chosen.has(option.id)).length === chosen.size
      const rightNumber = question.type === 'single' ? chosen.size === 1 : chosen.size >= 1
      if (question.type === 'free_form' || !known || !rightNumber) return 'invalid-answer'

      for (const option of live) {
        tx.update(options)
          .set({ isCorrect: chosen.has(option.id) })
          .where(eq(options.id, option.id))
          .run()
      }
      remarkQuestion(tx, questionId)
    }

    tx.update(questions).set({ reviewedAt: now }).where(eq(questions.id, questionId)).run()
    return 'done'
  })
}
