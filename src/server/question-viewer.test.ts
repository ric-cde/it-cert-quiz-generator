import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  countViewerQuestions,
  filterViewer,
  matchesViewerFilter,
  type ViewerData,
  type ViewerQuestion,
} from '../shared/question-viewer'
import { createApi } from './app'
import { commitImport } from './bank-import'
import { type Db, openDb } from './db'
import { questions, questionStars, questionStats, sources, users } from './db/schema'

const EXAM = 'OutSystems Associate Developer (O11)'
const single = (id: string, category: string) => ({
  externalId: id,
  type: 'single',
  category,
  bodyMd: `${id}?`,
  explanationMd: `Why ${id}`,
  options: [
    { label: 'A', bodyMd: `Right ${id}`, isCorrect: true, explanationMd: `Because ${id}` },
    { label: 'B', bodyMd: `Wrong ${id}`, isCorrect: false },
  ],
})

let db: Db
let api: ReturnType<typeof createApi>
let sourceId: number

const idOf = (externalId: string) => db.select().from(questions).where(eq(questions.externalId, externalId)).get()!.id

const setStats = (externalId: string, attemptCount: number, correctCount: number) =>
  db
    .insert(questionStats)
    .values({ userId: 1, questionId: idOf(externalId), attemptCount, correctCount, everCorrect: correctCount > 0 })
    .run()

const load = async (id = sourceId) => {
  const res = await api.request(`/api/dev/sources/${id}/questions`)
  expect(res.status).toBe(200)
  return (await res.json()) as ViewerData
}

beforeEach(() => {
  db = openDb(':memory:')
  api = createApi(db)
  const result = commitImport(db, {
    formatVersion: 1,
    exam: EXAM,
    source: { name: 'Alpha', origin: 'upload' },
    chapters: [
      { name: 'One', questions: [single('a1', 'Logic'), single('a2', 'Data Modeling')] },
      {
        name: 'Two',
        questions: [
          single('a3', 'Logic'),
          { externalId: 'a4', type: 'free_form', category: 'Logic', bodyMd: 'a4?', modelAnswerMd: 'Model a4' },
        ],
      },
    ],
  })
  if (!result.ok) throw new Error('import failed')
  sourceId = db.select().from(sources).get()!.id
})

describe('GET /api/dev/sources/:id/questions', () => {
  it('gives every question in full, by chapter, laid out as in a question bank', async () => {
    const data = await load()
    expect(data).toMatchObject({ exam: EXAM, source: 'Alpha' })
    expect(data.chapters.map((chapter) => [chapter.name, chapter.questions.map((q) => q.externalId)])).toEqual([
      ['One', ['a1', 'a2']],
      ['Two', ['a3', 'a4']],
    ])
    expect(data.chapters[0]!.questions[0]).toEqual({
      externalId: 'a1',
      category: 'Logic',
      type: 'single',
      bodyMd: 'a1?',
      options: [
        { label: 'A', bodyMd: 'Right a1', isCorrect: true, explanationMd: 'Because a1' },
        { label: 'B', bodyMd: 'Wrong a1', isCorrect: false },
      ],
      explanationMd: 'Why a1',
      history: { attempts: 0, correct: 0, starred: false },
    })
    expect(data.chapters[1]!.questions[1]).toEqual({
      externalId: 'a4',
      category: 'Logic',
      type: 'free_form',
      bodyMd: 'a4?',
      modelAnswerMd: 'Model a4',
      history: { attempts: 0, correct: 0, starred: false },
    })
  })

  it('carries your own history and stars, and nobody else’s', async () => {
    setStats('a1', 3, 1)
    db.insert(questionStars)
      .values({ userId: 1, questionId: idOf('a2') })
      .run()
    const other = db.insert(users).values({ name: 'Other', role: 'learner' }).returning().get()
    db.insert(questionStats)
      .values({ userId: other.id, questionId: idOf('a3'), attemptCount: 5 })
      .run()
    db.insert(questionStars)
      .values({ userId: other.id, questionId: idOf('a3') })
      .run()

    const [a1, a2, a3] = (await load()).chapters.flatMap((chapter) => chapter.questions)
    expect(a1!.history).toEqual({ attempts: 3, correct: 1, starred: false })
    expect(a2!.history).toEqual({ attempts: 0, correct: 0, starred: true })
    expect(a3!.history).toEqual({ attempts: 0, correct: 0, starred: false })
  })

  it('leaves out deleted and flagged questions, and a chapter left empty', async () => {
    db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.externalId, 'a3')).run()
    db.update(questions).set({ flaggedAt: new Date() }).where(eq(questions.externalId, 'a4')).run()
    db.update(questions).set({ flaggedAt: new Date() }).where(eq(questions.externalId, 'a2')).run()
    const data = await load()
    expect(data.chapters).toHaveLength(1)
    expect(data.chapters[0]!.questions.map((q) => q.externalId)).toEqual(['a1'])
  })

  it('is a 404 for a source that does not exist, and a 400 for a bad id', async () => {
    expect((await api.request('/api/dev/sources/999/questions')).status).toBe(404)
    expect((await api.request('/api/dev/sources/x/questions')).status).toBe(400)
  })

  it.each(['editor', 'learner'] as const)('is refused for an %s', async (role) => {
    db.update(users).set({ role }).run()
    expect((await api.request(`/api/dev/sources/${sourceId}/questions`)).status).toBe(403)
  })
})

describe('the viewer filters', () => {
  const never = { attempts: 0, correct: 0, starred: false }
  const firstTime = { attempts: 2, correct: 2, starred: false }
  const wrongThenRight = { attempts: 2, correct: 1, starred: false }
  const onlyWrong = { attempts: 2, correct: 0, starred: true }

  it('counts a question as incorrect if it was ever wrong, even if right since', () => {
    expect(matchesViewerFilter(wrongThenRight, 'incorrect')).toBe(true)
    expect(matchesViewerFilter(onlyWrong, 'incorrect')).toBe(true)
    expect(matchesViewerFilter(firstTime, 'incorrect')).toBe(false)
    expect(matchesViewerFilter(never, 'incorrect')).toBe(false)
  })

  it('counts a question as correct only if it was right first time and never wrong', () => {
    expect(matchesViewerFilter(firstTime, 'correct')).toBe(true)
    expect(matchesViewerFilter(wrongThenRight, 'correct')).toBe(false)
    expect(matchesViewerFilter(never, 'correct')).toBe(false)
  })

  it('counts a question as unsolved if it was never right, including never tried', () => {
    expect(matchesViewerFilter(never, 'unsolved')).toBe(true)
    expect(matchesViewerFilter(onlyWrong, 'unsolved')).toBe(true)
    expect(matchesViewerFilter(wrongThenRight, 'unsolved')).toBe(false)
  })

  it('matches starred questions whatever their history', () => {
    expect(matchesViewerFilter(onlyWrong, 'starred')).toBe(true)
    expect(matchesViewerFilter(never, 'starred')).toBe(false)
  })

  const question = (externalId: string, history: ViewerQuestion['history']): ViewerQuestion => ({
    externalId,
    category: 'Logic',
    type: 'free_form',
    bodyMd: externalId,
    history,
  })
  const data: ViewerData = {
    exam: 'Exam',
    source: 'Source',
    chapters: [
      { name: 'One', questions: [question('never', never), question('firstTime', firstTime)] },
      { name: 'Two', questions: [question('wrongThenRight', wrongThenRight)] },
      { name: 'Three', questions: [question('onlyWrong', onlyWrong)] },
    ],
  }
  const ids = (filtered: ViewerData) =>
    filtered.chapters.flatMap((chapter) => chapter.questions.map((q) => q.externalId))

  it('shows everything with no filter on', () => {
    expect(filterViewer(data, [])).toBe(data)
    expect(countViewerQuestions(data)).toBe(4)
  })

  it('shows questions matching any filter that is on, and drops chapters left empty', () => {
    expect(ids(filterViewer(data, ['correct']))).toEqual(['firstTime'])
    expect(filterViewer(data, ['correct']).chapters.map((chapter) => chapter.name)).toEqual(['One'])
    expect(ids(filterViewer(data, ['incorrect']))).toEqual(['wrongThenRight', 'onlyWrong'])
    expect(ids(filterViewer(data, ['starred', 'correct']))).toEqual(['firstTime', 'onlyWrong'])
    expect(ids(filterViewer(data, ['incorrect', 'unsolved']))).toEqual(['never', 'wrongThenRight', 'onlyWrong'])
  })
})
