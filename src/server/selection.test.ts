import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { QuizState } from '../shared/quiz'
import {
  buildPool,
  matchesStatus,
  type Pool,
  type PoolQuestion,
  type PracticeData,
  practiceView,
  quizMix,
  selectQuestions,
} from '../shared/practice'
import { type SelectionInput, selectionSchema, type Status } from '../shared/selection'
import { createApi } from './app'
import { commitImport } from './bank-import'
import { type Db, openDb } from './db'
import { categories, chapters, questions, quizzes, sources } from './db/schema'
import { nameSelection } from './selection'

/* ---------- The rules, on a pool built by hand ---------- */

// Source 1 has chapters 11 and 12. Source 2 has chapters 21 and 22, and 22 is empty.
// Category 1 has topic 101. Category 2 has no topics.
const CHAPTER_SOURCE = new Map([
  [11, 1],
  [12, 1],
  [21, 2],
  [22, 2],
])

const fresh = { askable: true, attempted: false, latestCorrect: false, everCorrect: false }
const q = (id: number, chapterId: number, categoryId: number, extra: Partial<PoolQuestion> = {}): PoolQuestion => ({
  id,
  chapterId,
  sourceId: CHAPTER_SOURCE.get(chapterId)!,
  categoryId,
  topCategoryId: categoryId === 101 ? 1 : categoryId,
  ...fresh,
  ...extra,
})

const pool: Pool = {
  chapterSource: CHAPTER_SOURCE,
  questions: [
    q(1, 11, 1),
    q(2, 11, 2, { attempted: true, latestCorrect: true, everCorrect: true }),
    q(3, 12, 101, { attempted: true, latestCorrect: false, everCorrect: true }),
    q(4, 12, 2, { attempted: true, latestCorrect: false, everCorrect: false }),
    q(5, 21, 1),
    q(6, 21, 2, { attempted: true, latestCorrect: true, everCorrect: true }),
    q(7, 21, 1, { askable: false }),
  ],
}

const pick = (input: SelectionInput) => selectQuestions(pool, selectionSchema.parse(input))

describe('selectQuestions', () => {
  it('draws from the whole exam when no tile is chosen, leaving out what cannot be asked', () => {
    expect(pick({})).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('adds tiles of the same type together', () => {
    expect(pick({ categoryIds: [2] })).toEqual([2, 4, 6])
    expect(pick({ categoryIds: [1, 2] })).toEqual([1, 2, 3, 4, 5, 6])
    expect(pick({ chapterIds: [11, 21] })).toEqual([1, 2, 5, 6])
    expect(pick({ sourceIds: [1, 2] })).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('includes its topics with a category, and a topic alone when chosen', () => {
    expect(pick({ categoryIds: [1] })).toEqual([1, 3, 5])
    expect(pick({ categoryIds: [101] })).toEqual([3])
  })

  it('narrows across types: source and category', () => {
    expect(pick({ sourceIds: [1], categoryIds: [1] })).toEqual([1, 3])
    expect(pick({ chapterIds: [21], categoryIds: [2] })).toEqual([6])
  })

  it('narrows a selected source to the chapters chosen inside it', () => {
    expect(pick({ sourceIds: [1], chapterIds: [12] })).toEqual([3, 4])
    expect(pick({ sourceIds: [1], chapterIds: [11, 12] })).toEqual([1, 2, 3, 4])
  })

  it('gives all of one source plus a chapter of another, not an empty result', () => {
    expect(pick({ sourceIds: [1], chapterIds: [21] })).toEqual([1, 2, 3, 4, 5, 6])
    expect(pick({ sourceIds: [2], chapterIds: [11] })).toEqual([1, 2, 5, 6])
  })

  it('narrows a source to an empty chapter, giving nothing from it', () => {
    expect(pick({ sourceIds: [2], chapterIds: [22] })).toEqual([])
  })

  it('applies the status filter on top of the tiles', () => {
    expect(pick({ status: 'unanswered' })).toEqual([1, 5])
    expect(pick({ status: 'incorrect' })).toEqual([3, 4])
    expect(pick({ status: 'unsolved' })).toEqual([1, 4, 5])
    expect(pick({ sourceIds: [1], status: 'unsolved' })).toEqual([1, 4])
  })

  it('matches nothing for ids that are not in the exam', () => {
    expect(pick({ categoryIds: [999] })).toEqual([])
    expect(pick({ chapterIds: [999] })).toEqual([])
  })
})

describe('practiceView', () => {
  // The same questions as the pool above, as the screen would load them.
  const data: PracticeData = {
    exam: { id: 1, name: 'Exam', subject: 'Subject' },
    categories: [
      { id: 1, name: 'One', official: true, parentId: null },
      { id: 2, name: 'Two', official: true, parentId: null },
      { id: 3, name: 'Nothing yet', official: true, parentId: null },
      { id: 101, name: 'One topic', official: true, parentId: 1 },
    ],
    sources: [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
    ],
    chapters: [...CHAPTER_SOURCE].map(([id, sourceId]) => ({ id, name: `Chapter ${id}`, sourceId })),
    questions: [],
  }
  const view = (input: SelectionInput) => practiceView(data, pool, selectionSchema.parse(input))
  const counts = (tiles: { id: number; count: number }[]) => Object.fromEntries(tiles.map((tile) => [tile.id, tile.count]))

  it('counts every tile in full when nothing is picked', () => {
    const now = view({})
    expect(counts(now.categories)).toEqual({ 1: 3, 2: 3, 3: 0 })
    expect(counts(now.sources)).toEqual({ 1: 4, 2: 2 })
    expect(now.categories.find((tile) => tile.id === 3)!.empty).toBe(true)
  })

  it('narrows source and chapter tiles by the categories picked, and not by each other', () => {
    const now = view({ categoryIds: [1], sourceIds: [1] })
    expect(counts(now.sources)).toEqual({ 1: 2, 2: 1 })
    expect(counts(now.sources[0]!.chapters)).toEqual({ 11: 1, 12: 1 })
    // Category tiles are narrowed by the source, but not by the other category.
    expect(counts(now.categories)).toEqual({ 1: 2, 2: 2, 3: 0 })
  })

  it('narrows the bars the same way, whatever the status filter', () => {
    const now = view({ categoryIds: [2], status: 'unanswered' })
    const first = now.sources.find((tile) => tile.id === 1)!
    expect(first.count).toBe(0)
    expect(first.progress).toEqual({ correct: 1, incorrect: 1, total: 2 })
    // At 0 for now, but it has questions, so it can still be picked.
    expect(first.empty).toBe(false)
  })

  it('agrees with the questions a quiz would get', () => {
    const selection = { categoryIds: [1], chapterIds: [11, 21] }
    expect(view(selection).available).toBe(pick(selection).length)
  })

  it('counts what each status would give for the tiles picked, whichever status is on', () => {
    expect(view({ status: 'incorrect' }).statusCounts).toEqual({ all: 6, unanswered: 2, incorrect: 2, unsolved: 3 })
    expect(view({ sourceIds: [1] }).statusCounts).toEqual({ all: 4, unanswered: 1, incorrect: 2, unsolved: 2 })
  })
})

describe('quizMix', () => {
  const ids = (input: SelectionInput) => pick(input)

  it('counts every question when the quiz takes them all', () => {
    expect(quizMix(pool, ids({}), undefined, 'random')).toEqual({ correct: 2, incorrect: 2, unanswered: 2 })
    expect(quizMix(pool, ids({}), 10, 'source')).toEqual({ correct: 2, incorrect: 2, unanswered: 2 })
  })

  it('takes the first ones in source order', () => {
    // Questions 1, 2 and 3: unanswered, correct, then right once and wrong since.
    expect(quizMix(pool, ids({}), 3, 'source')).toEqual({ correct: 1, incorrect: 1, unanswered: 1 })
    expect(quizMix(pool, ids({}), 1, 'source')).toEqual({ correct: 0, incorrect: 0, unanswered: 1 })
  })

  it('shares out a capped random quiz in proportion, adding up to the cap', () => {
    // Two unanswered and one incorrect, capped at two.
    expect(quizMix(pool, ids({ status: 'unsolved' }), 2, 'random')).toEqual({ correct: 0, incorrect: 1, unanswered: 1 })
    const mix = quizMix(pool, ids({}), 4, 'random')
    expect(mix.correct + mix.incorrect + mix.unanswered).toBe(4)
    for (const part of Object.values(mix)) expect(part === 1 || part === 2).toBe(true)
  })
})

describe('matchesStatus', () => {
  const cases: [Partial<PoolQuestion>, Status[]][] = [
    [{}, ['all', 'unanswered', 'unsolved']],
    [{ attempted: true, latestCorrect: true, everCorrect: true }, ['all']],
    [{ attempted: true, latestCorrect: false, everCorrect: true }, ['all', 'incorrect']],
    [{ attempted: true, latestCorrect: false, everCorrect: false }, ['all', 'incorrect', 'unsolved']],
  ]
  it.each(cases)('%o passes %o', (history, passes) => {
    const question = q(1, 11, 1, history)
    const statuses: Status[] = ['all', 'unanswered', 'incorrect', 'unsolved']
    expect(statuses.filter((status) => matchesStatus(question, status))).toEqual(passes)
  })
})

describe('nameSelection', () => {
  // Category 1 has topics 101 and 102. Source 1 has chapters 11 and 12, source 2 has chapter 21.
  const names = {
    categories: [
      { id: 1, name: 'Logic', parentId: null },
      { id: 2, name: 'Data', parentId: null },
      { id: 101, name: 'Exceptions', parentId: 1 },
      { id: 102, name: 'Timers', parentId: 1 },
    ],
    sources: [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ],
    chapters: [
      { id: 11, name: 'Alpha one', sourceId: 1 },
      { id: 12, name: 'Alpha two', sourceId: 1 },
      { id: 21, name: 'Beta one', sourceId: 2 },
    ],
  }
  const name = (input: SelectionInput) => nameSelection(selectionSchema.parse(input), names)

  it.each<[string, SelectionInput, string]>([
    ['nothing', {}, 'Random'],
    ['nothing, with a status', { status: 'unsolved' }, 'Random'],
    ['one category', { categoryIds: [1] }, 'Logic'],
    ['one topic', { categoryIds: [101] }, 'Exceptions'],
    ['topics of one category', { categoryIds: [101, 102] }, 'Logic'],
    ['a category and its own topic', { categoryIds: [1, 101] }, 'Logic'],
    ['two categories', { categoryIds: [1, 2] }, 'Multiple categories'],
    ['a topic and another category', { categoryIds: [101, 2] }, 'Multiple categories'],
    ['one source', { sourceIds: [1] }, 'Alpha'],
    ['one chapter', { chapterIds: [12] }, 'Alpha two'],
    ['a source narrowed to one chapter', { sourceIds: [1], chapterIds: [12] }, 'Alpha two'],
    ['two chapters of one source', { chapterIds: [11, 12] }, 'Alpha'],
    ['two sources', { sourceIds: [1, 2] }, 'Multiple sources'],
    ['a source and a chapter of another', { sourceIds: [1], chapterIds: [21] }, 'Multiple sources'],
    ['a chapter and a category: the chapter is more specific', { chapterIds: [21], categoryIds: [1] }, 'Beta one'],
    ['a source and a category: the category is more specific', { sourceIds: [1], categoryIds: [2] }, 'Data'],
    ['two sources and a category', { sourceIds: [1, 2], categoryIds: [2] }, 'Data'],
    ['a source and two categories', { sourceIds: [1], categoryIds: [1, 2] }, 'Alpha'],
    ['two of each', { sourceIds: [1, 2], categoryIds: [1, 2] }, 'Multiple categories'],
  ])('%s', (_case, input, expected) => {
    expect(name(input)).toBe(expected)
  })
})

/* ---------- Through the API: the count must match the quiz ---------- */

const EXAM = 'OutSystems Associate Developer (O11)'
const single = (id: string, category: string) => ({
  externalId: id,
  type: 'single',
  category,
  bodyMd: `${id}?`,
  options: [
    { bodyMd: `Right ${id}`, isCorrect: true },
    { bodyMd: `Wrong ${id}`, isCorrect: false },
  ],
})

describe('the take-exam API', () => {
  let db: Db
  let app: ReturnType<typeof createApi>
  let examId: number

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const load = async () => (await (await send('GET', `/api/exams/${examId}/practice`)).json()) as PracticeData
  /** What the take-exam screen shows: the metadata loaded once, then counted locally. */
  const practice = async (selection: SelectionInput = {}) => {
    const data = await load()
    return { exam: data.exam, ...practiceView(data, buildPool(data), selectionSchema.parse(selection)) }
  }
  const startQuiz = async (selection: SelectionInput, limit?: number) => {
    const res = await send('POST', '/api/quizzes', { examId, feedback: 'after_each', ...selection, ...(limit ? { limit } : {}) })
    if (res.status !== 201) return null
    const { id } = (await res.json()) as { id: number }
    return db.select().from(quizzes).where(eq(quizzes.id, id)).get()!
  }
  const idOf = {
    category: (name: string) => db.select().from(categories).where(eq(categories.name, name)).get()!.id,
    source: (name: string) => db.select().from(sources).where(eq(sources.name, name)).get()!.id,
    chapter: (name: string) => db.select().from(chapters).where(eq(chapters.name, name)).get()!.id,
  }

  beforeEach(() => {
    db = openDb(':memory:')
    app = createApi(db)
    const imported = [
      {
        name: 'Alpha',
        chapters: [
          { name: 'Alpha one', questions: [single('a1', 'Logic'), single('a2', 'Logic'), single('a3', 'Data Modeling')] },
          { name: 'Alpha two', questions: [single('a4', 'Data Modeling'), single('a5', 'Logic')] },
        ],
      },
      {
        name: 'Beta',
        chapters: [{ name: 'Beta one', questions: [single('b1', 'Logic'), single('b2', 'Data Modeling'), single('b3', 'Logic')] }],
      },
    ].map((source) =>
      commitImport(db, { formatVersion: 1, exam: EXAM, source: { name: source.name, origin: 'upload' }, chapters: source.chapters }),
    )
    if (!imported.every((result) => result.ok)) throw new Error('import failed')
    examId = db.select().from(sources).get()!.examId
  })

  it('shows tiles with counts and progress, official categories first', async () => {
    const options = await practice()
    expect(options.exam.name).toBe(EXAM)
    expect(options.available).toBe(8)
    const logic = options.categories.find((category) => category.name === 'Logic')!
    expect(logic).toMatchObject({ count: 5, official: true, progress: { correct: 0, incorrect: 0, total: 5 } })
    // Official categories with no questions still show, as empty tiles.
    expect(options.categories.some((category) => category.count === 0)).toBe(true)
    expect(options.sources.map((source) => [source.name, source.count, source.chapters.map((chapter) => chapter.count)])).toEqual([
      ['Alpha', 5, [3, 2]],
      ['Beta', 3, [3]],
    ])
  })

  it('sends metadata only, never question text, with your history in a word', async () => {
    const data = await load()
    expect(JSON.stringify(data)).not.toContain('Right a1')
    expect(data.questions[0]).toEqual({ id: expect.any(Number), chapterId: expect.any(Number), categoryId: expect.any(Number), history: 'new' })
  })

  it('is a 404 for an exam that does not exist', async () => {
    expect((await send('GET', '/api/exams/999/practice')).status).toBe(404)
    expect((await send('GET', '/api/exams/x/practice')).status).toBe(400)
  })

  it('makes exactly the count it promised, from the questions it promised, for many combinations', async () => {
    const selections: SelectionInput[] = [
      {},
      { categoryIds: [idOf.category('Logic')] },
      { categoryIds: [idOf.category('Logic'), idOf.category('Data Modeling')] },
      { sourceIds: [idOf.source('Alpha')] },
      { sourceIds: [idOf.source('Alpha')], chapterIds: [idOf.chapter('Alpha two')] },
      { sourceIds: [idOf.source('Alpha')], chapterIds: [idOf.chapter('Beta one')] },
      { sourceIds: [idOf.source('Beta')], categoryIds: [idOf.category('Data Modeling')] },
      { chapterIds: [idOf.chapter('Alpha one'), idOf.chapter('Beta one')], categoryIds: [idOf.category('Logic')] },
    ]
    for (const selection of selections) {
      for (const status of ['all', 'unanswered'] as const) {
        const { available } = await practice({ ...selection, status })
        const quiz = await startQuiz({ ...selection, status })
        expect(quiz?.questionIds.length ?? 0, JSON.stringify(selection)).toBe(available)

        if (available > 1) {
          const capped = await startQuiz({ ...selection, status }, available - 1)
          expect(capped!.questionIds).toHaveLength(available - 1)
          expect(quiz!.questionIds).toEqual(expect.arrayContaining(capped!.questionIds))
        }
        const over = await startQuiz({ ...selection, status }, available + 10)
        expect(over?.questionIds.length ?? 0).toBe(available)
      }
    }
  })

  it('follows answers: status filters, tile counts and progress all move together', async () => {
    const alpha = idOf.source('Alpha')
    const quiz = await startQuiz({ chapterIds: [idOf.chapter('Alpha two')] })
    for (const [index, pick] of ['Right', 'Wrong'].entries()) {
      const now = (await (await send('GET', `/api/quizzes/${quiz!.id}`)).json()) as QuizState
      const option = now.current!.options.find((o) => o.bodyMd.startsWith(pick))!
      await send('POST', `/api/quizzes/${quiz!.id}/answer`, { questionId: now.current!.id, selectedOptionIds: [option.id] })
      if (index === 0) await send('POST', `/api/quizzes/${quiz!.id}/next`, { questionId: now.current!.id })
    }

    const all = await practice()
    const alphaTile = all.sources.find((source) => source.id === alpha)!
    expect(alphaTile.progress).toEqual({ correct: 1, incorrect: 1, total: 5 })
    expect(alphaTile.chapters[1]!.progress).toEqual({ correct: 1, incorrect: 1, total: 2 })

    const unanswered = await practice({ status: 'unanswered' })
    expect(unanswered.available).toBe(6)
    expect(unanswered.sources.find((source) => source.id === alpha)!.chapters.map((chapter) => chapter.count)).toEqual([3, 0])
    expect((await practice({ status: 'incorrect' })).available).toBe(1)
    expect((await practice({ status: 'unsolved' })).available).toBe(7)
  })

  it('keeps source order when asked, and a cap takes the first questions', async () => {
    const order = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3']
    const idsOf = (externalIds: string[]) =>
      externalIds.map((externalId) => db.select().from(questions).where(eq(questions.externalId, externalId)).get()!.id)

    const res = await send('POST', '/api/quizzes', { examId, feedback: 'after_each', sort: 'source' })
    const whole = db.select().from(quizzes).where(eq(quizzes.id, ((await res.json()) as { id: number }).id)).get()!
    expect(whole.questionIds).toEqual(idsOf(order))
    expect(whole.config.sort).toBe('source')

    const capped = await send('POST', '/api/quizzes', { examId, feedback: 'after_each', sort: 'source', limit: 2, chapterIds: [idOf.chapter('Alpha two'), idOf.chapter('Beta one')] })
    const first = db.select().from(quizzes).where(eq(quizzes.id, ((await capped.json()) as { id: number }).id)).get()!
    expect(first.questionIds).toEqual(idsOf(['a4', 'a5']))
  })

  it('leaves flagged questions out of counts, progress and quizzes', async () => {
    db.update(questions).set({ flaggedAt: new Date() }).where(eq(questions.externalId, 'b1')).run()
    const options = await practice()
    expect(options.available).toBe(7)
    expect(options.sources.find((source) => source.name === 'Beta')!.progress.total).toBe(2)
    expect((await startQuiz({}))!.questionIds).toHaveLength(7)
  })

  it('names a quiz on the home page after what it was drawn from, leaving out the status', async () => {
    await startQuiz({ sourceIds: [idOf.source('Beta')], status: 'unanswered' })
    const home = (await (await send('GET', '/api/home')).json()) as import('../shared/selection').HomeOverview
    expect(home.unfinished.map((quiz) => quiz.label)).toEqual(['Beta'])
  })

  it('shows each exam and source with progress on the home page', async () => {
    const home = (await (await send('GET', '/api/home')).json()) as import('../shared/selection').HomeOverview
    const exam = home.subjects.flatMap((subject) => subject.exams).find((item) => item.id === examId)!
    expect(exam.progress).toEqual({ correct: 0, incorrect: 0, total: 8 })
    expect(exam.sources.map((source) => [source.name, source.progress.total])).toEqual([
      ['Alpha', 5],
      ['Beta', 3],
    ])
  })

  it('moves passed and abandoned exams out of their subject into their own lists, and back', async () => {
    type Home = import('../shared/selection').HomeOverview
    const home = async () => (await (await send('GET', '/api/home')).json()) as Home
    const ids = (list: { id: number }[]) => list.map((exam) => exam.id)
    const active = async () => ids((await home()).subjects.flatMap((subject) => subject.exams))

    expect(await active()).toContain(examId)
    expect((await send('PUT', `/api/exams/${examId}/status`, { status: 'passed' })).status).toBe(200)
    let now = await home()
    expect(await active()).not.toContain(examId)
    expect(now.passed).toEqual([expect.objectContaining({ id: examId, status: 'passed' })])
    // The subject had only this exam, so it disappears from the subjects list.
    expect(now.subjects.map((subject) => subject.name)).not.toContain('OutSystems')

    await send('PUT', `/api/exams/${examId}/status`, { status: 'abandoned' })
    now = await home()
    expect([ids(now.passed), ids(now.abandoned)]).toEqual([[], [examId]])

    await send('PUT', `/api/exams/${examId}/status`, { status: 'active' })
    expect(await active()).toContain(examId)
    expect((await send('PUT', '/api/exams/999/status', { status: 'passed' })).status).toBe(404)
    expect((await send('PUT', `/api/exams/${examId}/status`, { status: 'failed' })).status).toBe(400)
  })
})
