import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { QuizState } from '../shared/quiz'
import { createApi } from './app'
import { commitImport } from './bank-import'
import { type Db, openDb } from './db'
import { attempts, options, questions, questionStats, quizzes, sources } from './db/schema'
import { resolveReview } from './review'

const EXAM = 'OutSystems Associate Developer (O11)'

const single = (n: number, overrides: object = {}) => ({
  externalId: `q${n}`,
  type: 'single',
  category: 'Logic',
  bodyMd: `Question ${n}?`,
  options: [
    { bodyMd: `Right ${n}`, isCorrect: true, explanationMd: `Why right ${n}` },
    { bodyMd: `Wrong ${n}`, isCorrect: false, explanationMd: `Why wrong ${n}` },
    { bodyMd: `Other ${n}`, isCorrect: false },
  ],
  ...overrides,
})

const multi = (n: number) => ({
  externalId: `q${n}`,
  type: 'multi',
  category: 'Logic',
  bodyMd: `Question ${n}?`,
  options: [
    { bodyMd: `Right ${n}`, isCorrect: true },
    { bodyMd: `Also right ${n}`, isCorrect: true },
    { bodyMd: `Wrong ${n}`, isCorrect: false },
  ],
})

const bank = (list: object[], name = 'Quiz source') => ({
  formatVersion: 1,
  exam: EXAM,
  source: { name, origin: 'upload' },
  chapters: [{ name: 'One', questions: list }],
})

describe('quizzes', () => {
  let db: Db
  let app: ReturnType<typeof createApi>
  let sourceId: number
  let examId: number

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

  async function start(feedback: 'after_each' | 'at_end' = 'after_each', extra: object = {}) {
    const res = await send('POST', '/api/quizzes', { examId, sourceIds: [sourceId], feedback, ...extra })
    expect(res.status).toBe(201)
    return ((await res.json()) as { id: number }).id
  }
  const state = async (id: number) => (await (await send('GET', `/api/quizzes/${id}`)).json()) as QuizState
  const act = (id: number, action: string, body?: unknown) => send('POST', `/api/quizzes/${id}/${action}`, body)
  const acted = async (id: number, action: string, body?: unknown) => (await (await act(id, action, body)).json()) as QuizState

  const optionNamed = (now: QuizState, prefix: string) => now.current!.options.find((o) => o.bodyMd.startsWith(prefix))!
  const answer = (now: QuizState, ...prefixes: string[]) => ({
    questionId: now.current!.id,
    selectedOptionIds: prefixes.map((prefix) => optionNamed(now, prefix).id),
  })
  const stored = () => db.select().from(attempts).all()
  const statsFor = (questionId: number) => db.select().from(questionStats).where(eq(questionStats.questionId, questionId)).get()

  beforeEach(() => {
    db = openDb(':memory:')
    app = createApi(db)
    const result = commitImport(db, bank([single(1), single(2), single(3)]))
    if (!result.ok) throw new Error('import failed')
    sourceId = result.sourceId
    examId = db.select().from(sources).where(eq(sources.id, sourceId)).get()!.examId
  })

  describe('starting', () => {
    it('includes each question once, in some order', async () => {
      const id = await start()
      const row = db.select().from(quizzes).where(eq(quizzes.id, id)).get()!
      expect([...row.questionIds].sort()).toEqual(db.select().from(questions).all().map((q) => q.id).sort())
      expect(row).toMatchObject({
        mode: 'study',
        position: 0,
        finishedAt: null,
        config: { feedback: 'after_each', selection: { sourceIds: [sourceId], status: 'all' } },
      })
    })

    it('can be capped', async () => {
      const id = await start('after_each', { limit: 2 })
      expect((await state(id)).total).toBe(2)
    })

    it('leaves out flagged, deleted and free-form questions, but keeps doubtful ones', async () => {
      commitImport(
        db,
        bank(
          [
            single(4, { reviewNote: 'Looks wrong' }),
            { externalId: 'free', type: 'free_form', category: 'Logic', bodyMd: 'Explain?', modelAnswerMd: 'Like this.' },
          ],
          'Quiz source',
        ),
      )
      db.update(questions).set({ flaggedAt: new Date() }).where(eq(questions.externalId, 'q1')).run()
      db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.externalId, 'q2')).run()

      const row = db.select().from(quizzes).where(eq(quizzes.id, await start())).get()!
      const kept = db.select().from(questions).all().filter((q) => row.questionIds.includes(q.id))
      expect(kept.map((q) => q.externalId).sort()).toEqual(['q3', 'q4'])
    })

    it('refuses a selection with nothing to ask, or an exam that does not exist', async () => {
      db.update(questions).set({ flaggedAt: new Date() }).run()
      expect((await send('POST', '/api/quizzes', { examId, feedback: 'at_end' })).status).toBe(409)
      expect((await send('POST', '/api/quizzes', { examId: 999, feedback: 'at_end' })).status).toBe(404)
    })

    it('validates the body', async () => {
      expect((await send('POST', '/api/quizzes', { examId, feedback: 'whenever' })).status).toBe(400)
      expect((await send('POST', '/api/quizzes', { examId, feedback: 'at_end', status: 'sometimes' })).status).toBe(400)
      expect((await send('POST', '/api/quizzes', { sourceId, feedback: 'at_end' })).status).toBe(400)
    })

    it('lists unfinished quizzes on the home page, until they finish', async () => {
      const id = await start('at_end')
      const home = (await (await send('GET', '/api/home')).json()) as { unfinished: unknown[] }
      expect(home.unfinished).toEqual([
        { id, exam: EXAM, label: 'Quiz source', feedback: 'at_end', position: 0, total: 3, startedAt: expect.stringMatching(/^\d{4}-/) },
      ])

      await act(id, 'finish')
      const later = (await (await send('GET', '/api/home')).json()) as { unfinished: unknown[] }
      expect(later.unfinished).toEqual([])
    })
  })

  describe('before answering', () => {
    it('sends nothing that gives the answer away', async () => {
      commitImport(db, bank([single(1, { reviewNote: 'The answer is really Wrong 1.' })]))
      db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.externalId, 'q2')).run()
      db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.externalId, 'q3')).run()

      const now = await state(await start())
      const text = JSON.stringify(now)
      expect(text).not.toContain('isCorrect')
      expect(text).not.toContain('Why right')
      expect(text).not.toContain('really')
      expect(now.current).toMatchObject({ inDoubt: true, outcome: null })
      expect(now.current).not.toHaveProperty('category')
    })

    it('keeps the same option order on resume, so the number keys still match', async () => {
      const id = await start()
      expect((await state(id)).current!.options).toEqual((await state(id)).current!.options)
    })

    it('shuffles options, except when the order is locked', async () => {
      const texts = (prefix: string) => Array.from({ length: 8 }, (_, i) => `${prefix} ${i}`)
      const optionsFrom = (list: string[]) => list.map((bodyMd, i) => ({ bodyMd, isCorrect: i === 0 }))
      const loose = commitImport(db, bank([{ ...single(7), options: optionsFrom(texts('Loose')) }], 'Loose'))
      const locked = commitImport(
        db,
        bank([{ ...single(8), lockOptionOrder: true, options: optionsFrom(texts('Locked')) }], 'Locked'),
      )
      if (!loose.ok || !locked.ok) throw new Error('import failed')

      sourceId = loose.sourceId
      const looseOrder = (await state(await start())).current!.options.map((o) => o.bodyMd)
      expect(looseOrder).not.toEqual(texts('Loose'))
      expect([...looseOrder].sort()).toEqual(texts('Loose'))

      sourceId = locked.sourceId
      expect((await state(await start())).current!.options.map((o) => o.bodyMd)).toEqual(texts('Locked'))
    })
  })

  describe('feedback after each question', () => {
    it('marks a right answer, locks it and shows the text', async () => {
      const id = await start()
      const before = await state(id)
      const after = await acted(id, 'answer', { ...answer(before, 'Right'), durationMs: 1234 })

      expect(after.position).toBe(0)
      expect(after.current!.outcome).toEqual({
        result: 'correct',
        kind: 'answered',
        selectedOptionIds: [optionNamed(before, 'Right').id],
      })
      expect(optionNamed(after, 'Right')).toMatchObject({ isCorrect: true, explanationMd: expect.stringContaining('Why right') })
      expect(optionNamed(after, 'Wrong')).toMatchObject({ isCorrect: false, explanationMd: expect.stringContaining('Why wrong') })
      expect(after.current!.category).toBe('Logic')

      expect(stored()[0]).toMatchObject({ result: 'correct', kind: 'answered', durationMs: 1234, quizId: id })
      expect(statsFor(before.current!.id)).toMatchObject({ difficulty: 3, attemptCount: 1, latestCorrect: true, streak: 1 })
    })

    it('shows the explanation of the whole question once locked, and a topic with its category', async () => {
      db.update(questions).set({ explanationMd: 'About the question.' }).run()
      const aggregates = commitImport(db, bank([single(9, { category: 'Aggregates' })], 'Topics'))
      if (!aggregates.ok) throw new Error('import failed')
      sourceId = aggregates.sourceId
      const id = await start()
      const before = await state(id)
      expect(before.current).not.toHaveProperty('explanationMd')

      const after = await acted(id, 'answer', answer(before, 'Right'))
      expect(after.current).toMatchObject({ category: 'Fetching Data › Aggregates', explanationMd: null })
    })

    it('includes the question explanation after a reveal', async () => {
      db.update(questions).set({ explanationMd: 'About the question.' }).run()
      const id = await start()
      const before = await state(id)
      const after = await acted(id, 'reveal', { questionId: before.current!.id })
      expect(after.current!.explanationMd).toBe('About the question.')
    })

    it('marks a wrong answer and sets difficulty', async () => {
      const id = await start()
      const before = await state(id)
      const after = await acted(id, 'answer', answer(before, 'Wrong'))

      expect(after.current!.outcome!.result).toBe('incorrect')
      expect(statsFor(before.current!.id)).toMatchObject({ difficulty: 5, latestCorrect: false, everCorrect: false })
    })

    it('counts a reveal as a miss, and shows only the correct answer text', async () => {
      const id = await start()
      const before = await state(id)
      const after = await acted(id, 'reveal', { questionId: before.current!.id })

      expect(after.current!.outcome).toMatchObject({ result: 'incorrect', kind: 'revealed', selectedOptionIds: [] })
      expect(optionNamed(after, 'Right').explanationMd).toContain('Why right')
      expect(optionNamed(after, 'Wrong').explanationMd).toBeNull()
      expect(stored()[0]).toMatchObject({ kind: 'revealed', result: 'incorrect', selectedOptionIds: [] })
      expect(statsFor(before.current!.id)).toMatchObject({ difficulty: 5 })
    })

    it('allows one try: a second submit changes nothing', async () => {
      const id = await start()
      const before = await state(id)
      await act(id, 'answer', answer(before, 'Wrong'))
      const second = await acted(id, 'answer', answer(before, 'Right'))

      expect(second.current!.outcome!.result).toBe('incorrect')
      expect(stored()).toHaveLength(1)
      expect(statsFor(before.current!.id)).toMatchObject({ attemptCount: 1 })
    })

    it('shows the note on a doubtful question only once it is answered', async () => {
      db.update(questions).set({ reviewNote: 'Check this one.' }).run()
      const id = await start()
      const before = await state(id)
      expect(before.current).not.toHaveProperty('reviewNote')

      const after = await acted(id, 'answer', answer(before, 'Right'))
      expect(after.current).toMatchObject({ inDoubt: true, reviewNote: 'Check this one.' })
    })

    it('shows no warning once the doubt has been settled', async () => {
      db.update(questions).set({ reviewNote: 'Check this one.' }).run()
      for (const q of db.select().from(questions).all()) resolveReview(db, q.id, { action: 'keep' })
      expect((await state(await start())).current).toMatchObject({ inDoubt: false })
    })

    it('does not move on until the question is answered', async () => {
      const id = await start()
      const before = await state(id)
      expect((await act(id, 'next', { questionId: before.current!.id })).status).toBe(409)
      expect((await state(id)).position).toBe(0)
    })

    it('moves on once answered, and a second press does not skip a question', async () => {
      const id = await start()
      const before = await state(id)
      await act(id, 'answer', answer(before, 'Right'))

      const after = await acted(id, 'next', { questionId: before.current!.id })
      expect(after.position).toBe(1)
      expect(after.current!.outcome).toBeNull()

      expect((await act(id, 'next', { questionId: before.current!.id })).status).toBe(409)
      expect((await state(id)).position).toBe(1)
    })

    it('resumes where it left off, including a locked question', async () => {
      const id = await start()
      const before = await state(id)
      await act(id, 'answer', answer(before, 'Wrong'))

      const reopened = await state(id)
      expect(reopened.current!.id).toBe(before.current!.id)
      expect(reopened.current!.outcome!.result).toBe('incorrect')
    })

    it('finishes after the last question, with results', async () => {
      const id = await start()
      const prefixes = ['Right', 'Wrong', null]
      let now = await state(id)
      for (const prefix of prefixes) {
        const questionId = now.current!.id
        await (prefix ? act(id, 'answer', answer(now, prefix)) : act(id, 'reveal', { questionId }))
        now = await acted(id, 'next', { questionId })
      }
      expect(now).toMatchObject({
        finished: true,
        current: null,
        results: { correct: 1, incorrect: 1, revealed: 1, skipped: 0, notReached: 0 },
      })
      expect(db.select().from(quizzes).get()!.finishedAt).toBeInstanceOf(Date)
    })
  })

  describe('feedback at the end', () => {
    it('records and moves on, showing nothing about the answer', async () => {
      const id = await start('at_end')
      const before = await state(id)
      const after = await acted(id, 'answer', answer(before, 'Wrong'))

      expect(after.position).toBe(1)
      expect(after.current!.id).not.toBe(before.current!.id)
      expect(JSON.stringify(after)).not.toContain('isCorrect')
      expect(after.current!.outcome).toBeNull()
      expect(stored()[0]).toMatchObject({ result: 'incorrect', kind: 'answered' })
    })

    it('has no reveal', async () => {
      const id = await start('at_end')
      const before = await state(id)
      expect((await act(id, 'reveal', { questionId: before.current!.id })).status).toBe(400)
      expect(stored()).toEqual([])
    })

    it('skips with nothing selected, logging no attempt', async () => {
      const id = await start('at_end')
      const before = await state(id)
      const after = await acted(id, 'next', { questionId: before.current!.id })

      expect(after.position).toBe(1)
      expect(stored()).toEqual([])
      expect(statsFor(before.current!.id)).toBeUndefined()
    })

    it('cannot go back to change an answer', async () => {
      const id = await start('at_end')
      const before = await state(id)
      await act(id, 'answer', answer(before, 'Wrong'))

      expect((await act(id, 'answer', answer(before, 'Right'))).status).toBe(409)
      expect(stored()).toHaveLength(1)
    })

    it('counts answers and skips in the results', async () => {
      const id = await start('at_end')
      let now = await state(id)
      now = await acted(id, 'answer', answer(now, 'Right'))
      now = await acted(id, 'next', { questionId: now.current!.id })
      now = await acted(id, 'answer', answer(now, 'Wrong'))

      expect(now).toMatchObject({
        finished: true,
        results: { correct: 1, incorrect: 1, revealed: 0, skipped: 1, notReached: 0 },
      })
    })
  })

  describe('multi-answer questions', () => {
    let id: number
    let now: QuizState

    beforeEach(async () => {
      const result = commitImport(db, bank([multi(5)], 'Multi'))
      if (!result.ok) throw new Error('import failed')
      sourceId = result.sourceId
      id = await start()
      now = await state(id)
    })

    it.each([
      ['every correct option', ['Right', 'Also'], 'correct'],
      ['one short', ['Right'], 'incorrect'],
      ['the right ones plus an extra', ['Right', 'Also', 'Wrong'], 'incorrect'],
      ['only a wrong one', ['Wrong'], 'incorrect'],
    ])('scores %s all-or-nothing', async (_name, prefixes, result) => {
      const after = await acted(id, 'answer', answer(now, ...prefixes))
      expect(after.current!.outcome!.result).toBe(result)
    })
  })

  describe('refuses a bad answer', () => {
    it('with two options on a single-answer question', async () => {
      const id = await start()
      const now = await state(id)
      expect((await act(id, 'answer', answer(now, 'Right', 'Wrong'))).status).toBe(400)
      expect(stored()).toEqual([])
    })

    it('with an option from another question, or the same option twice', async () => {
      const id = await start()
      const now = await state(id)
      const foreign = db.select().from(options).all().find((o) => o.questionId !== now.current!.id)!
      expect((await act(id, 'answer', { questionId: now.current!.id, selectedOptionIds: [foreign.id] })).status).toBe(400)

      const twice = optionNamed(now, 'Right').id
      expect((await act(id, 'answer', { questionId: now.current!.id, selectedOptionIds: [twice, twice] })).status).toBe(400)
      expect(stored()).toEqual([])
    })

    it('with nothing selected, or for a question the quiz is not on', async () => {
      const id = await start()
      const now = await state(id)
      expect((await act(id, 'answer', { questionId: now.current!.id, selectedOptionIds: [] })).status).toBe(400)
      expect((await act(id, 'answer', { questionId: 999, selectedOptionIds: [1] })).status).toBe(409)
    })

    it('for a quiz that does not exist, or has finished', async () => {
      const id = await start()
      const now = await state(id)
      expect((await act(999, 'answer', answer(now, 'Right'))).status).toBe(404)
      expect((await send('GET', '/api/quizzes/999')).status).toBe(404)
      expect((await send('GET', '/api/quizzes/abc')).status).toBe(400)

      await act(id, 'finish')
      expect((await act(id, 'answer', answer(now, 'Right'))).status).toBe(409)
    })
  })

  describe('ending early', () => {
    it('keeps what was answered, and counts the rest as not reached', async () => {
      const id = await start()
      const now = await state(id)
      await act(id, 'answer', answer(now, 'Right'))

      const ended = await acted(id, 'finish')
      expect(ended).toMatchObject({
        finished: true,
        results: { correct: 1, incorrect: 0, revealed: 0, skipped: 0, notReached: 2 },
      })
      expect(stored()).toHaveLength(1)
    })

    it('shows the results again when reopened, and ending twice is harmless', async () => {
      const id = await start()
      const first = await acted(id, 'finish')
      expect(await acted(id, 'finish')).toEqual(first)
      expect(await state(id)).toEqual(first)
    })
  })

  describe('flagging', () => {
    const flag = (id: number, body: object = {}) => send('PUT', `/api/questions/${id}/flag`, body)
    const row = (id: number) => db.select().from(questions).where(eq(questions.id, id)).get()!

    it('flags, keeps the first date, saves a reason and can undo', async () => {
      const id = db.select().from(questions).get()!.id
      expect((await flag(id)).status).toBe(200)
      const first = row(id).flaggedAt
      expect(first).toBeInstanceOf(Date)

      await flag(id, { reason: '  The wording is broken  ' })
      expect(row(id)).toMatchObject({ flaggedAt: first, flagReason: 'The wording is broken' })

      await flag(id)
      expect(row(id).flagReason).toBe('The wording is broken')

      expect((await send('DELETE', `/api/questions/${id}/flag`)).status).toBe(200)
      expect(row(id)).toMatchObject({ flaggedAt: null, flagReason: null })
    })

    it('is a 404 for a question that does not exist', async () => {
      expect((await flag(999)).status).toBe(404)
      expect((await send('DELETE', '/api/questions/999/flag')).status).toBe(404)
    })

    it('shows in the quiz, and lets you move on from a question too broken to answer', async () => {
      const id = await start()
      const now = await state(id)
      await flag(now.current!.id, { reason: 'Nonsense' })

      const flagged = await state(id)
      expect(flagged.current!.flag).toEqual({ reason: 'Nonsense' })

      const after = await acted(id, 'next', { questionId: now.current!.id })
      expect(after.position).toBe(1)
      expect(stored()).toEqual([])
    })

    it('keeps a flagged question out of the next quiz', async () => {
      const first = await start()
      const now = await state(first)
      await flag(now.current!.id)

      const second = db.select().from(quizzes).where(eq(quizzes.id, await start())).get()!
      expect(second.questionIds).not.toContain(now.current!.id)
      expect(second.questionIds).toHaveLength(2)
    })
  })

  describe('questions removed during a quiz', () => {
    it('steps over one that was deleted', async () => {
      const id = await start()
      const quiz = db.select().from(quizzes).where(eq(quizzes.id, id)).get()!
      db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.id, quiz.questionIds[0]!)).run()

      const now = await state(id)
      expect(now.current!.id).toBe(quiz.questionIds[1])
      expect(now.position).toBe(1)
    })

    it('steps over one that a re-import turned into free-form', async () => {
      const id = await start()
      const quiz = db.select().from(quizzes).where(eq(quizzes.id, id)).get()!
      db.update(questions).set({ type: 'free_form' }).where(eq(questions.id, quiz.questionIds[0]!)).run()

      expect((await state(id)).current!.id).toBe(quiz.questionIds[1])
    })

    it('finishes if none are left, leaving them out of the results', async () => {
      const id = await start()
      db.update(questions).set({ deletedAt: new Date() }).run()
      expect(await state(id)).toMatchObject({
        finished: true,
        current: null,
        results: { correct: 0, incorrect: 0, revealed: 0, skipped: 0, notReached: 0 },
      })
    })
  })

  describe('results', () => {
    /** Answers each question by its prefix: Right, Wrong, reveal, or skip (at-the-end only). */
    async function play(id: number, moves: ('Right' | 'Wrong' | 'reveal' | 'skip')[]) {
      for (const move of moves) {
        const now = await state(id)
        const questionId = now.current!.id
        if (move === 'reveal') await act(id, 'reveal', { questionId })
        else if (move === 'skip') await act(id, 'next', { questionId })
        else await act(id, 'answer', answer(now, move))
        if (now.feedback === 'after_each' && move !== 'skip') await act(id, 'next', { questionId })
      }
      return state(id)
    }

    it('breaks the score down by category, weakest first, and counts what Retry missed would ask', async () => {
      commitImport(db, bank([single(4, { category: 'Data' })]))
      const id = await start('after_each', { sourceIds: [sourceId] })
      const quiz = db.select().from(quizzes).where(eq(quizzes.id, id)).get()!
      const dataId = db.select().from(questions).where(eq(questions.externalId, 'q4')).get()!.id
      // Data is answered right, so whatever else happens Logic is the weaker.
      const moves = quiz.questionIds.map((qid, index) => (qid === dataId ? 'Right' : index % 2 ? 'reveal' : 'Wrong'))
      const done = await play(id, moves as ('Right' | 'reveal' | 'Wrong')[])

      expect(done.summary).toEqual({
        byCategory: [
          { name: 'Logic', correct: 0, asked: 3 },
          { name: 'Data', correct: 1, asked: 1 },
        ],
        missed: 3,
        examId,
        label: 'Quiz source',
      })
    })

    it('has no summary while the quiz is still going', async () => {
      expect((await state(await start())).summary).toBeNull()
    })

    it('retries the incorrect, revealed and skipped questions, but not ones never reached', async () => {
      commitImport(db, bank([single(4), single(5)]))
      const id = await start('at_end')
      await play(id, ['Right', 'Wrong', 'skip'])
      await act(id, 'finish')
      const quiz = db.select().from(quizzes).where(eq(quizzes.id, id)).get()!

      const res = await send('POST', `/api/quizzes/${id}/retry`)
      expect(res.status).toBe(201)
      const retry = db.select().from(quizzes).where(eq(quizzes.id, ((await res.json()) as { id: number }).id)).get()!
      expect([...retry.questionIds].sort()).toEqual(quiz.questionIds.slice(1, 3).sort())
      expect(retry.config).toMatchObject({ feedback: 'at_end', retryOf: id })
      const home = (await (await send('GET', '/api/home')).json()) as { unfinished: { label: string }[] }
      expect(home.unfinished[0]!.label).toBe('Retry missed: Quiz source')
    })

    it('leaves questions flagged since out of a retry, and refuses one with nothing to ask', async () => {
      const id = await start()
      expect((await send('POST', `/api/quizzes/${id}/retry`)).status).toBe(409)

      const done = await play(id, ['Wrong', 'Right', 'Right'])
      expect(done.summary!.missed).toBe(1)
      const missedId = db.select().from(attempts).where(eq(attempts.result, 'incorrect')).get()!.questionId
      db.update(questions).set({ flaggedAt: new Date() }).where(eq(questions.id, missedId)).run()

      expect((await state(id)).summary!.missed).toBe(0)
      expect((await send('POST', `/api/quizzes/${id}/retry`)).status).toBe(409)
      expect((await send('POST', '/api/quizzes/999/retry')).status).toBe(404)
    })

    it('reviews every answer in order, with options as shown, marking skips and leaving out what was never reached', async () => {
      commitImport(db, bank([single(4)]))
      const id = await start('at_end')
      const shown = (await state(id)).current!.options.map((option) => option.id)
      await play(id, ['Wrong', 'skip'])
      await act(id, 'finish')

      const res = await send('GET', `/api/quizzes/${id}/review`)
      expect(res.status).toBe(200)
      const entries = (await res.json()) as import('../shared/quiz').ReviewEntry[]
      expect(entries.map((entry) => [entry.number, entry.outcome])).toEqual([
        [1, 'incorrect'],
        [2, 'skipped'],
      ])
      expect(entries[0]!.options.map((option) => option.id)).toEqual(shown)
      const chosen = entries[0]!.options.find((option) => option.chosen)!
      expect(chosen).toMatchObject({ isCorrect: false, explanationMd: expect.stringMatching(/^Why wrong/) })
      expect(entries[0]!.category).toBe('Logic')
      expect(entries[1]!.options.every((option) => !option.chosen)).toBe(true)
    })

    it('reviews only finished quizzes', async () => {
      const id = await start()
      expect((await send('GET', `/api/quizzes/${id}/review`)).status).toBe(409)
      expect((await send('GET', '/api/quizzes/999/review')).status).toBe(404)
    })
  })
})
