import { isRandom, type ProgressCounts, type Selection, type Status } from './selection'

/**
 * Choosing questions, shared by the server and the take-exam screen. The screen loads an exam's
 * question metadata once and works out every count and bar here, as you click. The server runs the
 * same functions on the same data to create the quiz, so the count you see is the quiz you get.
 */

/* ---------- What the screen loads: metadata only, no question text ---------- */

/**
 * Your history with a question:
 * - `new`: never attempted
 * - `correct`: latest attempt right
 * - `incorrect`: attempted, never right
 * - `lapsed`: right once, but the latest attempt wasn't
 */
export type QuestionHistory = 'new' | 'correct' | 'incorrect' | 'lapsed'

export type PracticeQuestion = {
  id: number
  chapterId: number
  categoryId: number
  history: QuestionHistory
  /** Free-form questions count towards progress but can't be asked until Stage 11. */
  freeForm?: true
}

export type PracticeData = {
  exam: { id: number; name: string; subject: string }
  /** Top-level categories in display order, then topics, which have a parent. */
  categories: { id: number; name: string; official: boolean; parentId: number | null }[]
  sources: { id: number; name: string }[]
  chapters: { id: number; name: string; sourceId: number }[]
  /** Every live, unflagged question in the exam. */
  questions: PracticeQuestion[]
}

/* ---------- The pool the rules work on ---------- */

export type PoolQuestion = {
  id: number
  chapterId: number
  sourceId: number
  /** The question's own category, which may be a topic. */
  categoryId: number
  /** The top-level category, which a topic rolls up into. */
  topCategoryId: number
  askable: boolean
  attempted: boolean
  latestCorrect: boolean
  everCorrect: boolean
}

export type Pool = {
  questions: PoolQuestion[]
  /** Every chapter in the exam and its source, including empty ones. */
  chapterSource: Map<number, number>
}

export function buildPool(data: Pick<PracticeData, 'categories' | 'chapters' | 'questions'>): Pool {
  const chapterSource = new Map(data.chapters.map((chapter) => [chapter.id, chapter.sourceId]))
  const parentOf = new Map(data.categories.map((category) => [category.id, category.parentId]))
  return {
    chapterSource,
    questions: data.questions.map((question) => ({
      id: question.id,
      chapterId: question.chapterId,
      sourceId: chapterSource.get(question.chapterId) ?? 0,
      categoryId: question.categoryId,
      topCategoryId: parentOf.get(question.categoryId) ?? question.categoryId,
      askable: !question.freeForm,
      attempted: question.history !== 'new',
      latestCorrect: question.history === 'correct',
      everCorrect: question.history === 'correct' || question.history === 'lapsed',
    })),
  }
}

/* ---------- The rules ---------- */

/**
 * - Unanswered: never attempted
 * - Incorrect: attempted, and the latest attempt wasn't right
 * - Unsolved: never right, including never attempted
 */
export function matchesStatus(question: PoolQuestion, status: Status) {
  switch (status) {
    case 'all':
      return true
    case 'unanswered':
      return !question.attempted
    case 'incorrect':
      return question.attempted && !question.latestCorrect
    case 'unsolved':
      return !question.everCorrect
  }
}

type Test = (question: PoolQuestion) => boolean

/** The category picks. Picking a category includes its topics. */
function categoryTest(selection: Selection): Test {
  const ids = new Set(selection.categoryIds)
  return (question) => ids.size === 0 || ids.has(question.categoryId) || ids.has(question.topCategoryId)
}

/**
 * The source and chapter picks, as one tree: a chapter inside a selected source narrows that
 * source to its picked chapters, and a chapter of a source that isn't selected adds to the rest.
 */
function treeTest(pool: Pool, selection: Selection): Test {
  const chapterIds = new Set(selection.chapterIds)
  const narrowed = new Set([...chapterIds].map((id) => pool.chapterSource.get(id)).filter((id) => id !== undefined))
  const wholeSources = new Set(selection.sourceIds.filter((id) => !narrowed.has(id)))
  if (selection.sourceIds.length === 0 && chapterIds.size === 0) return () => true
  return (question) => chapterIds.has(question.chapterId) || wholeSources.has(question.sourceId)
}

/**
 * The question ids a selection gives, in source order: by source, then chapter, then the order the
 * questions were imported in. Tiles of the same type add together, and the two types narrow each
 * other. Quiz creation shuffles these for Random, and caps them.
 */
export function selectQuestions(pool: Pool, selection: Selection): number[] {
  const inCategories = categoryTest(selection)
  const inTree = treeTest(pool, selection)
  return pool.questions
    .filter((q) => q.askable && matchesStatus(q, selection.status) && inCategories(q) && inTree(q))
    .sort((a, b) => a.sourceId - b.sourceId || a.chapterId - b.chapterId || a.id - b.id)
    .map((question) => question.id)
}

/** Green for latest correct, yellow for attempted but not right, and the rest unanswered. */
export function progressOf(list: readonly PoolQuestion[]): ProgressCounts {
  let correct = 0
  let incorrect = 0
  for (const question of list) {
    if (question.latestCorrect) correct += 1
    else if (question.attempted) incorrect += 1
  }
  return { correct, incorrect, total: list.length }
}

/* ---------- The tiles, as they look for the current selection ---------- */

export type TileView = {
  id: number
  name: string
  /** Questions this tile would add now: narrowed by the other type's picks and the status filter. */
  count: number
  /** Its questions under the other type's picks, whatever their status. */
  progress: ProgressCounts
  /** The tile has nothing that could ever be asked, so it can't be picked. */
  empty: boolean
}

export type PracticeView = {
  categories: (TileView & { official: boolean })[]
  sources: (TileView & { chapters: TileView[] })[]
  /** The "y" in "x of y available". */
  available: number
}

/**
 * Every tile's count and bar for the current selection. Category tiles are narrowed by the source
 * and chapter picks, and source and chapter tiles by the category picks. Tiles of the same type
 * add together, so they never narrow each other.
 */
export function practiceView(data: PracticeData, pool: Pool, selection: Selection): PracticeView {
  const random = isRandom(selection)
  const byTree = random ? () => true : treeTest(pool, selection)
  const byCategory = random ? () => true : categoryTest(selection)

  const tile = (id: number, name: string, mine: Test, narrow: Test): TileView => {
    const all = pool.questions.filter(mine)
    const narrowed = all.filter(narrow)
    return {
      id,
      name,
      count: narrowed.filter((q) => q.askable && matchesStatus(q, selection.status)).length,
      progress: progressOf(narrowed),
      empty: !all.some((q) => q.askable),
    }
  }

  const topLevel = data.categories.filter((category) => category.parentId === null)
  return {
    categories: topLevel
      .map((category) => ({
        ...tile(category.id, category.name, (q) => q.topCategoryId === category.id, byTree),
        official: category.official,
        unused: !pool.questions.some((q) => q.topCategoryId === category.id),
      }))
      // An unofficial category with nothing left in it, say after its questions moved, is just clutter.
      .filter(({ official, unused }) => official || !unused)
      .map(({ unused: _, ...category }) => category),
    sources: data.sources.map((source) => ({
      ...tile(source.id, source.name, (q) => q.sourceId === source.id, byCategory),
      chapters: data.chapters
        .filter((chapter) => chapter.sourceId === source.id)
        .map((chapter) => tile(chapter.id, chapter.name, (q) => q.chapterId === chapter.id, byCategory)),
    })),
    available: selectQuestions(pool, selection).length,
  }
}
