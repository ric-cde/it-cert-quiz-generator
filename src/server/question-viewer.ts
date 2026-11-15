import { and, asc, eq, isNull } from 'drizzle-orm'
import type { ViewerData, ViewerOption, ViewerQuestion } from '../shared/question-viewer'
import type { Tx } from './db'
import { categories, chapters, exams, options, questions, questionStars, questionStats, sources } from './db/schema'

/**
 * One source's questions in full, with a user's history on each, for the question viewer. Deleted
 * and flagged questions are left out, as they are from quizzes.
 */
export function viewerData(db: Pick<Tx, 'select'>, userId: number, sourceId: number): ViewerData | null {
  const source = db
    .select({ name: sources.name, exam: exams.name })
    .from(sources)
    .innerJoin(exams, eq(sources.examId, exams.id))
    .where(eq(sources.id, sourceId))
    .get()
  if (!source) return null

  const live = and(eq(chapters.sourceId, sourceId), isNull(questions.deletedAt), isNull(questions.flaggedAt))

  const optionRows = db
    .select({
      questionId: options.questionId,
      label: options.label,
      bodyMd: options.bodyMd,
      isCorrect: options.isCorrect,
      explanationMd: options.explanationMd,
    })
    .from(options)
    .innerJoin(questions, eq(options.questionId, questions.id))
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(and(live, isNull(options.deletedAt)))
    .orderBy(asc(options.position), asc(options.id))
    .all()
  const optionsOf = new Map<number, ViewerOption[]>()
  for (const { questionId, label, bodyMd, isCorrect, explanationMd } of optionRows) {
    const list = optionsOf.get(questionId) ?? []
    list.push({ ...(label ? { label } : {}), bodyMd, isCorrect, ...(explanationMd ? { explanationMd } : {}) })
    optionsOf.set(questionId, list)
  }

  const questionRows = db
    .select({
      id: questions.id,
      chapterId: questions.chapterId,
      externalId: questions.externalId,
      category: categories.name,
      type: questions.type,
      bodyMd: questions.bodyMd,
      explanationMd: questions.explanationMd,
      modelAnswerMd: questions.modelAnswerMd,
      attemptCount: questionStats.attemptCount,
      correctCount: questionStats.correctCount,
      starredAt: questionStars.createdAt,
    })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(categories, eq(questions.categoryId, categories.id))
    .leftJoin(questionStats, and(eq(questionStats.questionId, questions.id), eq(questionStats.userId, userId)))
    .leftJoin(questionStars, and(eq(questionStars.questionId, questions.id), eq(questionStars.userId, userId)))
    .where(live)
    .orderBy(asc(questions.id))
    .all()

  const questionsOf = new Map<number, ViewerQuestion[]>()
  for (const row of questionRows) {
    const list = questionsOf.get(row.chapterId) ?? []
    list.push({
      ...(row.externalId ? { externalId: row.externalId } : {}),
      category: row.category,
      type: row.type,
      bodyMd: row.bodyMd,
      ...(row.type === 'free_form' ? {} : { options: optionsOf.get(row.id) ?? [] }),
      ...(row.explanationMd ? { explanationMd: row.explanationMd } : {}),
      ...(row.modelAnswerMd ? { modelAnswerMd: row.modelAnswerMd } : {}),
      history: {
        attempts: row.attemptCount ?? 0,
        correct: row.correctCount ?? 0,
        starred: row.starredAt !== null,
      },
    })
    questionsOf.set(row.chapterId, list)
  }

  const chapterRows = db
    .select({ id: chapters.id, name: chapters.name })
    .from(chapters)
    .where(eq(chapters.sourceId, sourceId))
    .orderBy(asc(chapters.id))
    .all()

  return {
    exam: source.exam,
    source: source.name,
    chapters: chapterRows
      .map((chapter) => ({ name: chapter.name, questions: questionsOf.get(chapter.id) ?? [] }))
      .filter((chapter) => chapter.questions.length > 0),
  }
}
