import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApi } from './app'
import { commitImport, listSources, previewImport } from './bank-import'
import { type Db, openDb } from './db'
import { options, questions } from './db/schema'
import { listToReview, resolveReview } from './review'

const option = (bodyMd: string, isCorrect: boolean) => ({ bodyMd, isCorrect })
const doubted = (overrides: object = {}) => ({
  externalId: 'q1',
  type: 'single',
  category: 'Logic',
  bodyMd: 'What does it print?',
  reviewNote: 'The source says A, but it prints B.',
  options: [option('A', true), option('B', false), option('C', false)],
  ...overrides,
})
const bank = (questionList: object[], sourceName = 'Mock source') => ({
  formatVersion: 1,
  exam: 'OutSystems Associate Developer (O11)',
  source: { name: sourceName, origin: 'upload' },
  chapters: [{ name: 'One', questions: questionList }],
})

describe('review', () => {
  let db: Db
  beforeEach(() => {
    db = openDb(':memory:')
  })

  const question = () => db.select().from(questions).get()!
  const optionByText = (text: string) => db.select().from(options).where(eq(options.bodyMd, text)).get()!

  describe('importing a question with a note', () => {
    it('keeps it in quizzes, unflagged, and open for review', () => {
      const result = commitImport(db, bank([doubted()]))

      expect(result).toMatchObject({ ok: true, added: 1, toReview: 1 })
      expect(question()).toMatchObject({ reviewNote: 'The source says A, but it prints B.', reviewedAt: null, flaggedAt: null })
      expect(listSources(db)[0]).toMatchObject({ toReview: 1, flagged: 0 })
    })

    it('counts it in the preview, but not a skipped duplicate', () => {
      commitImport(db, bank([doubted({ reviewNote: undefined })]))
      const preview = previewImport(db, bank([doubted({ externalId: 'x' })], 'Other'))
      expect(preview).toMatchObject({ ok: true, counts: { duplicates: 1, toReview: 0 } })

      expect(previewImport(db, bank([doubted({ externalId: 'y', bodyMd: 'New?' })], 'Other'))).toMatchObject({
        counts: { toReview: 1 },
      })
    })

    it('reports only the open ones for the source just imported', () => {
      commitImport(db, bank([doubted()], 'First'))
      const second = commitImport(db, bank([doubted({ bodyMd: 'Clean?', reviewNote: undefined })], 'Second'))
      expect(second).toMatchObject({ toReview: 0 })
    })
  })

  describe('listToReview', () => {
    it('gives what is needed to decide, in option order, with no deleted options', () => {
      commitImport(db, bank([doubted()]))
      db.update(options).set({ deletedAt: new Date() }).where(eq(options.bodyMd, 'C')).run()

      const [item] = listToReview(db)
      expect(item).toMatchObject({
        source: 'Mock source',
        chapter: 'One',
        exam: 'OutSystems Associate Developer (O11)',
        reviewNote: 'The source says A, but it prints B.',
        externalId: 'q1',
      })
      expect(item!.options.map((o) => [o.bodyMd, o.isCorrect])).toEqual([
        ['A', true],
        ['B', false],
      ])
    })

    it('leaves out questions with no note, already reviewed, or deleted', () => {
      commitImport(
        db,
        bank([
          doubted(),
          doubted({ externalId: 'q2', bodyMd: 'Clean?', reviewNote: undefined }),
          doubted({ externalId: 'q3', bodyMd: 'Reviewed?' }),
          doubted({ externalId: 'q4', bodyMd: 'Deleted?' }),
        ]),
      )
      db.update(questions).set({ reviewedAt: new Date() }).where(eq(questions.externalId, 'q3')).run()
      db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.externalId, 'q4')).run()

      expect(listToReview(db).map((q) => q.externalId)).toEqual(['q1'])
    })

    it('can be limited to one source', () => {
      commitImport(db, bank([doubted()], 'First'))
      commitImport(db, bank([doubted({ externalId: 'x', bodyMd: 'Other?' })], 'Second'))

      expect(listToReview(db)).toHaveLength(2)
      expect(listToReview(db, 2).map((q) => q.source)).toEqual(['Second'])
    })
  })

  describe('resolveReview', () => {
    beforeEach(() => {
      commitImport(db, bank([doubted()]))
    })

    it('keeping it closes the review and changes nothing else', () => {
      expect(resolveReview(db, 1, { action: 'keep' })).toBe('done')

      expect(question().reviewedAt).toBeInstanceOf(Date)
      expect(question().reviewNote).toBe('The source says A, but it prints B.')
      expect(optionByText('A').isCorrect).toBe(true)
      expect(listToReview(db)).toEqual([])
    })

    it('changing the answer moves the correct mark', () => {
      expect(resolveReview(db, 1, { action: 'change-answer', correctOptionIds: [optionByText('B').id] })).toBe('done')

      expect(optionByText('A').isCorrect).toBe(false)
      expect(optionByText('B').isCorrect).toBe(true)
      expect(listToReview(db)).toEqual([])
    })

    it('taking it out flags it, with the note as the reason', () => {
      expect(resolveReview(db, 1, { action: 'take-out' })).toBe('done')

      expect(question()).toMatchObject({ flagReason: 'The source says A, but it prints B.', flaggedAt: expect.any(Date) })
      expect(listToReview(db)).toEqual([])
    })

    it.each<[string, () => number[]]>([
      ['two answers on a single answer question', () => [optionByText('A').id, optionByText('B').id]],
      ['an option from nowhere', () => [999]],
    ])('rejects %s, changing nothing', (_name, ids) => {
      expect(resolveReview(db, 1, { action: 'change-answer', correctOptionIds: ids() })).toBe('invalid-answer')
      expect(optionByText('A').isCorrect).toBe(true)
      expect(question().reviewedAt).toBeNull()
    })

    it('allows several answers on a multi-answer question', () => {
      commitImport(db, bank([doubted({ externalId: 'm', type: 'multi', bodyMd: 'Which?', options: [option('D', true), option('E', false)] })]))
      const id = db.select().from(questions).where(eq(questions.externalId, 'm')).get()!.id

      expect(resolveReview(db, id, { action: 'change-answer', correctOptionIds: [optionByText('D').id, optionByText('E').id] })).toBe('done')
      expect(optionByText('E').isCorrect).toBe(true)
    })

    it('refuses to change the answer of a free-form question', () => {
      commitImport(db, bank([{ externalId: 'f', type: 'free_form', category: 'Logic', bodyMd: 'Why?', modelAnswerMd: 'Because', reviewNote: 'Doubt' }]))
      const id = db.select().from(questions).where(eq(questions.externalId, 'f')).get()!.id
      expect(resolveReview(db, id, { action: 'change-answer', correctOptionIds: [1] })).toBe('invalid-answer')
    })

    it('reports a question with nothing to review', () => {
      expect(resolveReview(db, 99, { action: 'keep' })).toBe('not-found')
      resolveReview(db, 1, { action: 'keep' })
      expect(resolveReview(db, 1, { action: 'keep' })).toBe('not-found')
    })
  })

  describe('importing again after a review', () => {
    it('stays closed when nothing changed', () => {
      commitImport(db, bank([doubted()]))
      resolveReview(db, 1, { action: 'keep' })

      expect(commitImport(db, bank([doubted()]))).toMatchObject({ unchanged: 1, toReview: 0 })
      expect(listToReview(db)).toEqual([])
    })

    it('puts the answer back as the file has it, and opens the review again, because the file wins', () => {
      commitImport(db, bank([doubted()]))
      resolveReview(db, 1, { action: 'change-answer', correctOptionIds: [optionByText('B').id] })

      expect(commitImport(db, bank([doubted()]))).toMatchObject({ updated: 1, toReview: 1 })
      expect(optionByText('A').isCorrect).toBe(true)
      expect(optionByText('B').isCorrect).toBe(false)
      expect(listToReview(db)).toHaveLength(1)
    })

    it('opens the review again when the file has a new note', () => {
      commitImport(db, bank([doubted()]))
      resolveReview(db, 1, { action: 'keep' })

      commitImport(db, bank([doubted({ reviewNote: 'A different doubt.' })]))
      expect(listToReview(db).map((q) => q.reviewNote)).toEqual(['A different doubt.'])
    })

    it('clears the note when the file no longer has one', () => {
      commitImport(db, bank([doubted()]))
      commitImport(db, bank([doubted({ reviewNote: undefined })]))

      expect(question().reviewNote).toBeNull()
      expect(listToReview(db)).toEqual([])
    })

    it('overwrites edits made in the app with the text in the file', () => {
      commitImport(db, bank([doubted()]))
      db.update(questions).set({ bodyMd: 'Edited by hand' }).run()
      db.update(options).set({ bodyMd: 'Edited option' }).where(eq(options.bodyMd, 'C')).run()

      expect(commitImport(db, bank([doubted()]))).toMatchObject({ updated: 1 })
      expect(question().bodyMd).toBe('What does it print?')
      expect(db.select().from(options).all().filter((o) => !o.deletedAt).map((o) => o.bodyMd)).toEqual(['A', 'B', 'C'])
    })

    it('leaves a flag in place, because it is a verdict rather than content', () => {
      commitImport(db, bank([doubted()]))
      resolveReview(db, 1, { action: 'take-out' })

      commitImport(db, bank([doubted({ bodyMd: 'Reworded?' })]))
      expect(question().flaggedAt).toBeInstanceOf(Date)
    })
  })

  describe('routes', () => {
    const post = (id: string, body: unknown) =>
      createApi(db).request(`/api/review/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    beforeEach(() => {
      commitImport(db, bank([doubted()]))
    })

    it('lists and resolves', async () => {
      expect(await (await createApi(db).request('/api/review')).json()).toMatchObject([{ externalId: 'q1' }])
      expect(await (await createApi(db).request('/api/review?sourceId=99')).json()).toEqual([])

      expect((await post('1', { action: 'keep' })).status).toBe(200)
      expect(listToReview(db)).toEqual([])
    })

    it.each([
      ['an unknown action', { action: 'shrug' }],
      ['no answers', { action: 'change-answer', correctOptionIds: [] }],
      ['an extra field', { action: 'keep', surprise: true }],
    ])('rejects %s', async (_name, body) => {
      expect((await post('1', body)).status).toBe(400)
    })

    it('uses 400 for an answer that does not fit, and 404 for no such question', async () => {
      expect((await post('1', { action: 'change-answer', correctOptionIds: [999] })).status).toBe(400)
      expect((await post('99', { action: 'keep' })).status).toBe(404)
    })

    it('rejects a bad source ID', async () => {
      expect((await createApi(db).request('/api/review?sourceId=abc')).status).toBe(400)
    })
  })
})
