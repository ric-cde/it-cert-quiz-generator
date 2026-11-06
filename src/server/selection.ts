import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { buildPool, type Pool, type PracticeData, type QuestionHistory } from '../shared/practice'
import { isRandom, type Selection } from '../shared/selection'
import type { Tx } from './db'
import { categories, chapters, exams, questions, questionStats, sources, subjects } from './db/schema'

type Reader = Pick<Tx, 'select'>

const historyOf = (stats: { attemptCount: number | null; latestCorrect: boolean | null; everCorrect: boolean | null }): QuestionHistory =>
  !stats.attemptCount ? 'new' : stats.latestCorrect ? 'correct' : stats.everCorrect ? 'lapsed' : 'incorrect'

/**
 * An exam's question metadata for the take-exam screen, which works out every count from it. No
 * question text leaves the server here, only ids, places and your history.
 */
export function practiceData(db: Reader, userId: number, examId: number): PracticeData | null {
  const exam = db
    .select({ id: exams.id, name: exams.name, subject: subjects.name })
    .from(exams)
    .innerJoin(subjects, eq(exams.subjectId, subjects.id))
    .where(eq(exams.id, examId))
    .get()
  if (!exam) return null

  // Official categories first, in the order the syllabus defines them, then any from imported files.
  const categoryRows = db
    .select({ id: categories.id, name: categories.name, official: categories.official, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.examId, examId))
    .orderBy(asc(categories.id))
    .all()
    .sort((a, b) => Number(b.official) - Number(a.official))

  const questionRows = db
    .select({
      id: questions.id,
      type: questions.type,
      chapterId: questions.chapterId,
      categoryId: questions.categoryId,
      attemptCount: questionStats.attemptCount,
      latestCorrect: questionStats.latestCorrect,
      everCorrect: questionStats.everCorrect,
    })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(sources, eq(chapters.sourceId, sources.id))
    .leftJoin(questionStats, and(eq(questionStats.questionId, questions.id), eq(questionStats.userId, userId)))
    .where(and(eq(sources.examId, examId), isNull(questions.deletedAt), isNull(questions.flaggedAt)))
    .orderBy(asc(questions.id))
    .all()

  return {
    exam,
    categories: categoryRows,
    sources: db.select({ id: sources.id, name: sources.name }).from(sources).where(eq(sources.examId, examId)).orderBy(asc(sources.name)).all(),
    chapters: db
      .select({ id: chapters.id, name: chapters.name, sourceId: chapters.sourceId })
      .from(chapters)
      .innerJoin(sources, eq(chapters.sourceId, sources.id))
      .where(eq(sources.examId, examId))
      .orderBy(asc(chapters.id))
      .all(),
    questions: questionRows.map((row) => ({
      id: row.id,
      chapterId: row.chapterId,
      categoryId: row.categoryId,
      history: historyOf(row),
      ...(row.type === 'free_form' ? { freeForm: true as const } : {}),
    })),
  }
}

/** The pool for an exam, as the take-exam screen builds it. */
export function loadPool(db: Reader, userId: number, examId: number): Pool {
  const data = practiceData(db, userId, examId)
  return data ? buildPool(data) : { questions: [], chapterSource: new Map() }
}

type Named = { id: number; name: string }
export type SelectionNames = {
  categories: (Named & { parentId: number | null })[]
  sources: Named[]
  chapters: (Named & { sourceId: number })[]
}

/**
 * One short name for a selection, as specific as a single name can be, for the Resume list and
 * quiz history. The status filter isn't part of it.
 *
 * - The tree (sources and chapters) names one chapter, or one source when everything picked sits
 *   in it, or else "Multiple sources".
 * - Categories name one category, or the category that all the picked topics share, or else
 *   "Multiple categories".
 * - With both, the most specific single name wins: a chapter, then a category, then a source.
 */
export function nameSelection(selection: Selection, names: SelectionNames): string {
  if (isRandom(selection)) return 'Random'
  const byId = <T extends Named>(rows: T[], id: number) => rows.find((row) => row.id === id)

  const chapters = selection.chapterIds.map((id) => byId(names.chapters, id)).filter((row) => row !== undefined)
  const sourceIds = new Set([...selection.sourceIds, ...chapters.map((chapter) => chapter.sourceId)])
  let tree: { name: string; level: 'chapter' | 'source' } | 'multiple' | null = null
  if (sourceIds.size === 1) {
    const [sourceId] = sourceIds
    tree =
      chapters.length === 1
        ? { name: chapters[0]!.name, level: 'chapter' }
        : { name: byId(names.sources, sourceId!)?.name ?? 'Removed source', level: 'source' }
  } else if (sourceIds.size > 1) tree = 'multiple'

  const picked = selection.categoryIds.map((id) => byId(names.categories, id)).filter((row) => row !== undefined)
  let category: string | 'multiple' | null = null
  if (picked.length === 1) category = picked[0]!.name
  else if (picked.length > 1) {
    const parents = new Set(picked.map((row) => row.parentId ?? row.id))
    const [parentId] = parents
    category = parents.size === 1 ? (byId(names.categories, parentId!)?.name ?? 'Multiple categories') : 'multiple'
  }

  if (tree && tree !== 'multiple' && tree.level === 'chapter') return tree.name
  if (category && category !== 'multiple') return category
  if (tree && tree !== 'multiple') return tree.name
  if (category === 'multiple') return 'Multiple categories'
  return 'Multiple sources'
}

/** Loads what `nameSelection` needs for a selection's ids. */
export function describeSelection(db: Reader, selection: Selection): string {
  const categoryRows = db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
    .from(categories)
    .where(inArray(categories.id, selection.categoryIds))
    .all()
  const parentIds = categoryRows.flatMap((row) => (row.parentId ? [row.parentId] : []))
  const parents = parentIds.length
    ? db
        .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
        .from(categories)
        .where(inArray(categories.id, parentIds))
        .all()
    : []
  const chapterRows = db
    .select({ id: chapters.id, name: chapters.name, sourceId: chapters.sourceId })
    .from(chapters)
    .where(inArray(chapters.id, selection.chapterIds))
    .all()
  const sourceIds = [...selection.sourceIds, ...chapterRows.map((row) => row.sourceId)]
  const sourceRows = db.select({ id: sources.id, name: sources.name }).from(sources).where(inArray(sources.id, sourceIds)).all()
  return nameSelection(selection, { categories: [...categoryRows, ...parents], sources: sourceRows, chapters: chapterRows })
}
