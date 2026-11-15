import { and, asc, count, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm'
import type { SourceSummary } from '../shared/import'
import type { Db } from './db'
import {
  attempts,
  chapters,
  difficultyAdjustments,
  exams,
  explanations,
  options,
  questions,
  questionStars,
  questionStats,
  sources,
} from './db/schema'
import { countToReview } from './review'

/** The sources list on the import screen, and deleting a trial import. */

export function listSources(db: Db): SourceSummary[] {
  const countQuestions = (where: SQL | undefined) =>
    db
      .select({ value: count() })
      .from(questions)
      .innerJoin(chapters, eq(questions.chapterId, chapters.id))
      .where(where)
      .get()!.value

  return db
    .select({
      id: sources.id,
      exam: exams.name,
      name: sources.name,
      origin: sources.origin,
      trust: sources.trust,
      reference: sources.reference,
      icon: sources.icon,
    })
    .from(sources)
    .innerJoin(exams, eq(sources.examId, exams.id))
    .orderBy(asc(exams.id), asc(sources.name))
    .all()
    .map((source) => {
      const live = and(eq(chapters.sourceId, source.id), isNull(questions.deletedAt))
      return {
        ...source,
        chapters: db.select({ value: count() }).from(chapters).where(eq(chapters.sourceId, source.id)).get()!.value,
        questions: countQuestions(live),
        flagged: countQuestions(and(live, isNotNull(questions.flaggedAt))),
        toReview: countToReview(db, source.id),
        attempts: db
          .select({ value: count() })
          .from(attempts)
          .innerJoin(questions, eq(attempts.questionId, questions.id))
          .innerJoin(chapters, eq(questions.chapterId, chapters.id))
          .where(eq(chapters.sourceId, source.id))
          .get()!.value,
      }
    })
}

/**
 * Removes a source completely, for clearing out a trial import. A source with attempts is refused,
 * because attempts are history that must survive. Stage 11 adds soft deletion for those.
 */
export function deleteSource(db: Db, id: number): 'deleted' | 'not-found' | 'has-attempts' {
  return db.transaction((tx) => {
    if (!tx.select().from(sources).where(eq(sources.id, id)).get()) return 'not-found'

    const chapterIds = tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.sourceId, id))
      .all()
      .map((chapter) => chapter.id)
    const questionIds = chapterIds.length
      ? tx
          .select({ id: questions.id })
          .from(questions)
          .where(inArray(questions.chapterId, chapterIds))
          .all()
          .map((question) => question.id)
      : []

    if (questionIds.length > 0) {
      if (tx.select().from(attempts).where(inArray(attempts.questionId, questionIds)).limit(1).get()) {
        return 'has-attempts'
      }
      tx.delete(options).where(inArray(options.questionId, questionIds)).run()
      tx.delete(explanations).where(inArray(explanations.questionId, questionIds)).run()
      tx.delete(questionStars).where(inArray(questionStars.questionId, questionIds)).run()
      tx.delete(difficultyAdjustments).where(inArray(difficultyAdjustments.questionId, questionIds)).run()
      tx.delete(questionStats).where(inArray(questionStats.questionId, questionIds)).run()
      tx.delete(questions).where(inArray(questions.id, questionIds)).run()
    }
    tx.delete(chapters).where(eq(chapters.sourceId, id)).run()
    tx.delete(sources).where(eq(sources.id, id)).run()
    return 'deleted'
  })
}
