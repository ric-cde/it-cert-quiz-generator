import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportPlan } from '../shared/import'
import { createApi } from './app'
import { commitImport, deleteSource, listSources, previewImport } from './bank-import'
import { type Db, openDb } from './db'
import { attempts, categories, categoryAliases, chapters, options, questions, quizzes, sources } from './db/schema'

const EXAM = 'OutSystems Associate Developer (O11)'

const single = (overrides: object = {}) => ({
  externalId: 'q1',
  type: 'single',
  category: 'Logic',
  bodyMd: 'A question?',
  options: [
    { bodyMd: 'Right', isCorrect: true },
    { bodyMd: 'Wrong', isCorrect: false },
  ],
  ...overrides,
})

const bank = (questionList: object[], extra: object = {}) => ({
  formatVersion: 1,
  exam: EXAM,
  source: { name: 'Mock source', origin: 'upload' },
  chapters: [{ name: 'One', questions: questionList }],
  ...extra,
})

const plan = (db: Db, raw: unknown) => {
  const result = previewImport(db, raw)
  if (!result.ok) throw new Error(JSON.stringify(result.problems))
  return result
}
const firstAction = (result: ImportPlan) => result.chapters[0]!.questions[0]!

describe('import', () => {
  let db: Db
  beforeEach(() => {
    db = openDb(':memory:')
  })

  const allQuestions = () => db.select().from(questions).all()
  const allOptions = () => db.select().from(options).all()

  describe('preview', () => {
    it('saves nothing', () => {
      const result = plan(db, bank([single()]))
      expect(result.counts).toMatchObject({ new: 1, total: 1 })
      expect(result.source.exists).toBe(false)
      expect(db.select().from(sources).all()).toEqual([])
      expect(allQuestions()).toEqual([])
    })

    it('rejects an invalid file, saying why', () => {
      const result = previewImport(db, bank([single({ bodyMd: ' ' })]))
      expect(result.ok).toBe(false)
      expect(!result.ok && result.problems[0]?.location).toContain('question 1')
    })

    it('includes omitted questions and warnings', () => {
      const result = plan(db, bank([single({ bodyMd: 'Is List<String> valid?' })], { omitted: [{ reference: 'Q2', reason: 'Image' }] }))
      expect(result.omitted).toEqual([{ reference: 'Q2', reason: 'Image' }])
      expect(result.warnings).toHaveLength(1)
      expect(firstAction(result).warnings).toHaveLength(1)
    })
  })

  describe('a first import', () => {
    it('stores everything from the file', () => {
      const result = commitImport(
        db,
        bank([
          single({
            lockOptionOrder: true,
            options: [
              { bodyMd: 'Right', isCorrect: true, explanationMd: 'Because', explanationOrigin: 'generated' },
              { bodyMd: 'Wrong', isCorrect: false, explanationMd: 'Not this' },
            ],
          }),
          { externalId: 'q2', type: 'free_form', category: 'UI Design', bodyMd: 'Why?', modelAnswerMd: 'Because' },
        ]),
      )
      expect(result).toMatchObject({ ok: true, added: 2 })

      const [mc, free] = allQuestions()
      expect(mc).toMatchObject({ externalId: 'q1', type: 'single', bodyMd: 'A question?', lockOptionOrder: true, flaggedAt: null })
      expect(free).toMatchObject({ type: 'free_form', modelAnswerMd: 'Because' })
      expect(mc!.contentHash).toMatch(/^[0-9a-f]{64}$/)
      expect(allOptions()).toMatchObject([
        { bodyMd: 'Right', isCorrect: true, position: 0, explanationMd: 'Because', explanationOrigin: 'generated' },
        // No origin given means it came from the source.
        { bodyMd: 'Wrong', isCorrect: false, position: 1, explanationMd: 'Not this', explanationOrigin: 'source' },
      ])
      expect(db.select().from(sources).get()).toMatchObject({ name: 'Mock source', origin: 'upload' })
      expect(db.select().from(chapters).get()).toMatchObject({ name: 'One' })
    })

    it('saves nothing if the file is invalid', () => {
      const result = commitImport(db, bank([single(), single({ externalId: 'q2', bodyMd: ' ' })]))
      expect(result.ok).toBe(false)
      expect(db.select().from(sources).all()).toEqual([])
    })

    it('imports only the first few, as a trial, and the rest can follow', () => {
      const questionList = [1, 2, 3].map((n) => single({ externalId: `q${n}`, bodyMd: `Question ${n}?` }))
      expect(commitImport(db, bank(questionList), { limit: 2 })).toMatchObject({ added: 2, notImportedByLimit: 1 })
      expect(allQuestions()).toHaveLength(2)

      expect(commitImport(db, bank(questionList))).toMatchObject({ added: 1, unchanged: 2, notImportedByLimit: 0 })
      expect(allQuestions()).toHaveLength(3)
    })

    it('imports the example from the docs and the expected result of the skill test', () => {
      for (const path of ['docs/question-bank.example.json', 'skill/evals/mock-messy-source.expected.json']) {
        expect(commitImport(db, JSON.parse(readFileSync(path, 'utf8')))).toMatchObject({ ok: true })
      }
    })
  })

  describe('importing again', () => {
    it('with no changes does nothing, and says so', () => {
      commitImport(db, bank([single()]))
      const before = allQuestions()

      expect(firstAction(plan(db, bank([single()]))).action).toBe('unchanged')
      expect(commitImport(db, bank([single()]))).toMatchObject({ added: 0, updated: 0, unchanged: 1 })
      expect(allQuestions()).toEqual(before)
    })

    it('adds to an existing source and chapter', () => {
      commitImport(db, bank([single()]))
      const second = bank([single({ externalId: 'q2', bodyMd: 'Another?' })], {
        chapters: [
          { name: 'One', questions: [single({ externalId: 'q2', bodyMd: 'Another?' })] },
          { name: 'Two', questions: [single({ externalId: 'q3', bodyMd: 'A third?' })] },
        ],
      })
      expect(plan(db, second).source.exists).toBe(true)
      commitImport(db, second)

      expect(db.select().from(sources).all()).toHaveLength(1)
      expect(db.select().from(chapters).all().map((c) => c.name)).toEqual(['One', 'Two'])
      expect(allQuestions()).toHaveLength(3)
    })

    it('updates the same question when the wording changes, keeping its ID and option IDs', () => {
      commitImport(db, bank([single()]))
      const [before] = allQuestions()
      const optionIds = allOptions().map((o) => o.id)
      const changed = bank([single({ bodyMd: 'A corrected question?' })])

      expect(firstAction(plan(db, changed))).toMatchObject({ action: 'updated', changes: ['wording'] })
      expect(commitImport(db, changed)).toMatchObject({ added: 0, updated: 1 })

      const after = allQuestions()
      expect(after).toHaveLength(1)
      expect(after[0]!.id).toBe(before!.id)
      expect(after[0]!.bodyMd).toBe('A corrected question?')
      expect(after[0]!.contentHash).not.toBe(before!.contentHash)
      expect(allOptions().map((o) => o.id)).toEqual(optionIds)
    })

    it('keeps attempt history when a question is corrected', () => {
      commitImport(db, bank([single()]))
      const [question] = allQuestions()
      const [right] = allOptions()
      const quiz = db.insert(quizzes).values({ userId: 1, examId: 2, mode: 'study', config: { feedback: 'after_each', sourceId: 1 }, questionIds: [question!.id] }).returning().get()
      db.insert(attempts)
        .values({ userId: 1, questionId: question!.id, quizId: quiz.id, selectedOptionIds: [right!.id], result: 'correct', kind: 'answered' })
        .run()

      // The answer key was wrong, so the file now marks the other option.
      const fixed = bank([single({ options: [{ bodyMd: 'Right', isCorrect: false }, { bodyMd: 'Wrong', isCorrect: true }] })])
      expect(firstAction(plan(db, fixed)).changes).toEqual(['correct answer'])
      commitImport(db, fixed)

      expect(db.select().from(attempts).all()).toHaveLength(1)
      expect(allOptions().find((o) => o.id === right!.id)).toMatchObject({ bodyMd: 'Right', isCorrect: false })
    })

    it('soft-deletes an option that has gone, adds a new one, and restores one that returns', () => {
      commitImport(db, bank([single()]))
      const replaced = single({ options: [{ bodyMd: 'Right', isCorrect: true }, { bodyMd: 'New', isCorrect: false }] })
      commitImport(db, bank([replaced]))

      const after = allOptions()
      expect(after).toHaveLength(3)
      expect(after.find((o) => o.bodyMd === 'Wrong')!.deletedAt).toBeInstanceOf(Date)
      expect(after.find((o) => o.bodyMd === 'New')!.deletedAt).toBeNull()

      commitImport(db, bank([single()]))
      expect(allOptions().find((o) => o.bodyMd === 'Wrong')!.deletedAt).toBeNull()
      expect(allOptions().find((o) => o.bodyMd === 'New')!.deletedAt).toBeInstanceOf(Date)
    })

    it('does not count soft-deleted options as a change', () => {
      commitImport(db, bank([single()]))
      const replaced = bank([single({ options: [{ bodyMd: 'Right', isCorrect: true }, { bodyMd: 'New', isCorrect: false }] })])
      commitImport(db, replaced)
      expect(firstAction(plan(db, replaced)).action).toBe('unchanged')
    })

    it('never wipes an explanation that the file leaves blank', () => {
      const withText = single({
        options: [{ bodyMd: 'Right', isCorrect: true, explanationMd: 'Generated', explanationOrigin: 'generated' }, { bodyMd: 'Wrong', isCorrect: false }],
      })
      commitImport(db, bank([withText]))

      expect(firstAction(plan(db, bank([single()]))).action).toBe('unchanged')
      commitImport(db, bank([single({ bodyMd: 'Reworded?' })]))
      expect(allOptions()[0]).toMatchObject({ explanationMd: 'Generated', explanationOrigin: 'generated' })
    })

    it('moves a question between chapters and categories', () => {
      commitImport(db, bank([single()]))
      const moved = bank([], { chapters: [{ name: 'Two', questions: [single({ category: 'UI Design' })] }] })
      expect(firstAction(plan(db, moved)).changes).toEqual(['category', 'chapter'])

      commitImport(db, moved)
      expect(allQuestions()).toHaveLength(1)
      const two = db.select().from(chapters).where(eq(chapters.name, 'Two')).get()!
      expect(allQuestions()[0]!.chapterId).toBe(two.id)
    })

    it('can change a question to free-form, retiring its options', () => {
      commitImport(db, bank([single()]))
      commitImport(db, bank([{ externalId: 'q1', type: 'free_form', category: 'Logic', bodyMd: 'A question?', modelAnswerMd: 'Because' }]))

      expect(allQuestions()[0]).toMatchObject({ type: 'free_form', modelAnswerMd: 'Because' })
      expect(allOptions().every((o) => o.deletedAt)).toBe(true)
    })

    it('leaves questions alone that the file does not mention, and reports them', () => {
      commitImport(db, bank([single(), single({ externalId: 'q2', bodyMd: 'Another?' })]))
      expect(plan(db, bank([single()])).notInFile).toBe(1)

      commitImport(db, bank([single()]))
      expect(allQuestions().filter((q) => !q.deletedAt)).toHaveLength(2)
    })

    it('does not bring back a question deleted in the app', () => {
      commitImport(db, bank([single()]))
      db.update(questions).set({ deletedAt: new Date() }).run()

      expect(firstAction(plan(db, bank([single()]))).action).toBe('deleted')
      expect(commitImport(db, bank([single()]))).toMatchObject({ added: 0, skippedDeleted: 1 })
      expect(allQuestions()[0]!.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('with no externalId', () => {
    const { externalId: _, ...noId } = single()

    it('recognises the same question by its text, in any option order', () => {
      commitImport(db, bank([noId]))
      const reordered = { ...noId, options: [...noId.options].reverse() }
      expect(firstAction(plan(db, bank([reordered]))).action).toBe('updated')
      expect(commitImport(db, bank([reordered]))).toMatchObject({ added: 0, updated: 1 })
      expect(allQuestions()).toHaveLength(1)
    })

    it('treats changed wording as a new question', () => {
      commitImport(db, bank([noId]))
      expect(commitImport(db, bank([{ ...noId, bodyMd: 'Reworded?' }]))).toMatchObject({ added: 1 })
      expect(allQuestions()).toHaveLength(2)
    })

    it('adopts an ID when one is added later', () => {
      commitImport(db, bank([noId]))
      expect(commitImport(db, bank([single()]))).toMatchObject({ added: 0 })
      expect(allQuestions()).toMatchObject([{ externalId: 'q1' }])
    })

    it('stores no ID, and keeps one it already has', () => {
      commitImport(db, bank([noId]))
      expect(allQuestions()[0]!.externalId).toBeNull()
    })
  })

  describe('duplicates', () => {
    const otherSource = { source: { name: 'Other source', origin: 'upload' } }

    it('spots one already in another source, and skips it unless asked', () => {
      commitImport(db, bank([single()]))
      const incoming = bank([single({ externalId: 'x1' })], otherSource)

      const result = plan(db, incoming)
      expect(result.counts).toMatchObject({ new: 1, duplicates: 1 })
      expect(firstAction(result).duplicateOf).toEqual({ place: 'Mock source, One', answersDiffer: false })

      expect(commitImport(db, incoming)).toMatchObject({ added: 0, skippedDuplicates: 1 })
      expect(allQuestions()).toHaveLength(1)
      // Nothing was added, so no empty source is left behind.
      expect(db.select().from(sources).all()).toHaveLength(1)

      expect(commitImport(db, incoming, { includeDuplicates: true })).toMatchObject({ added: 1 })
      expect(allQuestions()).toHaveLength(2)
    })

    it('points out when two sources disagree about the answer', () => {
      commitImport(db, bank([single()]))
      const disagrees = single({ externalId: 'x1', options: [{ bodyMd: 'Right', isCorrect: false }, { bodyMd: 'Wrong', isCorrect: true }] })
      expect(firstAction(plan(db, bank([disagrees], otherSource))).duplicateOf?.answersDiffer).toBe(true)
    })

    it('spots one earlier in the same file', () => {
      const result = plan(db, bank([single(), single({ externalId: 'q2' })]))
      expect(result.chapters[0]!.questions[1]!.duplicateOf?.place).toBe('One, question 1 in this file')
      expect(commitImport(db, bank([single(), single({ externalId: 'q2' })]))).toMatchObject({ added: 1, skippedDuplicates: 1 })
    })

    it('ignores one in another exam, where the same question can reasonably appear', () => {
      commitImport(db, bank([single()]))
      const java = bank([single({ category: 'Handling Exceptions' })], { exam: 'Java SE 21 Developer Professional (1Z0-830)' })
      expect(plan(db, java).counts.duplicates).toBe(0)
    })

    it('does not count a deleted question as a duplicate', () => {
      commitImport(db, bank([single()]))
      db.update(questions).set({ deletedAt: new Date() }).run()
      expect(plan(db, bank([single({ externalId: 'x1' })], otherSource)).counts.duplicates).toBe(0)
    })
  })

  describe('categories', () => {
    const categoryOf = (externalId = 'q1') => {
      const question = db.select().from(questions).where(eq(questions.externalId, externalId)).get()!
      return db.select().from(categories).where(eq(categories.id, question.categoryId)).get()!
    }
    const byName = (name: string) => db.select().from(categories).where(eq(categories.name, name)).get()!

    it("lists each name in the file once, with how it matches the exam's own", () => {
      const result = plan(
        db,
        bank([
          single(),
          single({ externalId: 'q2', bodyMd: 'Two?', category: 'Aggregates' }),
          single({ externalId: 'q3', bodyMd: 'Three?', category: 'aggregates ' }),
          single({ externalId: 'q4', bodyMd: 'Four?', category: 'Something else' }),
          single({ externalId: 'q5', bodyMd: 'Five?', category: 'Something else' }),
        ]),
      )
      expect(result.categories).toEqual([
        { name: 'Logic', count: 1, status: 'official', target: expect.objectContaining({ name: 'Logic', parent: null }) },
        {
          name: 'Aggregates',
          count: 1,
          status: 'topic',
          target: expect.objectContaining({ name: 'Aggregates', parent: 'Fetching Data' }),
        },
        { name: 'aggregates ', count: 1, status: 'new', suggestion: expect.objectContaining({ name: 'Aggregates' }) },
        { name: 'Something else', count: 2, status: 'new' },
      ])
    })

    it('offers official categories, each followed by its topics', () => {
      const names = plan(db, bank([single()])).examCategories.map((c) => (c.parent ? `  ${c.name}` : c.name))
      expect(names.slice(0, 3)).toEqual(['UI Design', '  Screen Widgets', '  Blocks and Events'])
      expect(names).toHaveLength(20)
    })

    it('puts a question in an official topic as it is', () => {
      commitImport(db, bank([single({ category: 'Aggregates' })]))
      expect(categoryOf()).toMatchObject({ name: 'Aggregates', official: true })
    })

    it('keeps a new name as an unofficial category by default, created only when used', () => {
      commitImport(
        db,
        bank([single({ category: 'Performance' }), single({ externalId: 'q2', bodyMd: 'Two?', category: 'Unused' })]),
        { limit: 1 },
      )
      expect(categoryOf()).toMatchObject({ name: 'Performance', official: false, parentId: null })
      expect(db.select().from(categories).where(eq(categories.name, 'Unused')).get()).toBeUndefined()
    })

    it('maps a near match to the official name by default', () => {
      commitImport(db, bank([single({ category: 'aggregates' })]))
      expect(categoryOf().name).toBe('Aggregates')
    })

    it('maps a name where the user chose, and remembers it for the next file', () => {
      const target = byName('Form Validations').id
      commitImport(db, bank([single({ category: 'Forms' })]), { categoryChoices: { Forms: { map: target } } })
      expect(categoryOf().id).toBe(target)
      expect(db.select().from(categoryAliases).all()).toMatchObject([{ name: 'Forms', categoryId: target }])

      const next = plan(db, bank([single({ externalId: 'q2', bodyMd: 'Two?', category: 'Forms' })], { source: { name: 'Next', origin: 'upload' } }))
      expect(next.categories).toEqual([
        { name: 'Forms', count: 1, status: 'remembered', target: expect.objectContaining({ id: target }) },
      ])
      commitImport(db, bank([single({ externalId: 'q2', bodyMd: 'Two?', category: 'Forms' })], { source: { name: 'Next', origin: 'upload' } }))
      expect(categoryOf('q2').id).toBe(target)
    })

    it('can change a remembered choice to keeping the name, which forgets the mapping', () => {
      commitImport(db, bank([single({ category: 'Forms' })]), { categoryChoices: { Forms: { map: byName('Logic').id } } })
      commitImport(db, bank([single({ category: 'Forms' })]), { categoryChoices: { Forms: { keep: true } } })

      expect(categoryOf()).toMatchObject({ name: 'Forms', official: false })
      expect(db.select().from(categoryAliases).all()).toEqual([])
      expect(plan(db, bank([single({ category: 'Forms' })])).categories[0]!.status).toBe('unofficial')
    })

    it("ignores a choice for a name that's already the exam's own", () => {
      commitImport(db, bank([single()]), { categoryChoices: { Logic: { map: byName('UI Design').id } } })
      expect(categoryOf().name).toBe('Logic')
    })

    it("refuses a choice of category from another exam, and saves nothing", () => {
      const java = db.select().from(categories).where(eq(categories.name, 'Controlling Program Flow')).get()!
      const result = commitImport(db, bank([single({ category: 'Forms' })]), { categoryChoices: { Forms: { map: java.id } } })
      expect(result).toMatchObject({ ok: false, problems: [{ location: 'Category "Forms"' }] })
      expect(allQuestions()).toEqual([])
    })

    it('accepts choices through the API, and validates them', async () => {
      const api = createApi(db)
      const post = (body: object) =>
        api.request('/api/import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      expect((await post({ bank: bank([single()]), categoryChoices: { X: { map: 'one' } } })).status).toBe(400)
      expect((await post({ bank: bank([single({ category: 'X' })]), categoryChoices: { X: { keep: true } } })).status).toBe(200)
      expect(categoryOf()).toMatchObject({ name: 'X', official: false })
    })
  })

  describe('explanations', () => {
    const withText = (origin: 'source' | 'generated', text: string, overrides: object = {}) =>
      single({
        explanationMd: `${text} (question)`,
        explanationOrigin: origin,
        options: [
          { bodyMd: 'Right', isCorrect: true, explanationMd: `${text} (option)`, explanationOrigin: origin },
          { bodyMd: 'Wrong', isCorrect: false },
        ],
        ...overrides,
      })
    const question = () => allQuestions()[0]!
    const right = () => allOptions().find((option) => option.isCorrect)!

    it('saves text for the whole question as well as per option', () => {
      commitImport(db, bank([withText('source', 'Book')]))
      expect(question()).toMatchObject({ explanationMd: 'Book (question)', explanationOrigin: 'source' })
      expect(right()).toMatchObject({ explanationMd: 'Book (option)', explanationOrigin: 'source' })
    })

    it('treats text with no stated origin as from the source', () => {
      commitImport(db, bank([single({ explanationMd: 'Because.' })]))
      expect(question()).toMatchObject({ explanationMd: 'Because.', explanationOrigin: 'source' })
    })

    it('never lets AI-written text replace source text, and says so', () => {
      commitImport(db, bank([withText('source', 'Book')]))
      const preview = plan(db, bank([withText('generated', 'AI')]))
      expect(firstAction(preview)).toMatchObject({ action: 'unchanged' })
      expect(firstAction(preview).warnings[0]).toContain("Keeps the source's explanation for 2 parts")

      commitImport(db, bank([withText('generated', 'AI')]))
      expect(question()).toMatchObject({ explanationMd: 'Book (question)', explanationOrigin: 'source' })
      expect(right()).toMatchObject({ explanationMd: 'Book (option)', explanationOrigin: 'source' })
    })

    it('lets AI-written text fill a blank or replace other AI-written text', () => {
      commitImport(db, bank([single()]))
      commitImport(db, bank([withText('generated', 'First')]))
      expect(right()).toMatchObject({ explanationMd: 'First (option)', explanationOrigin: 'generated' })

      commitImport(db, bank([withText('generated', 'Second')]))
      expect(question()).toMatchObject({ explanationMd: 'Second (question)', explanationOrigin: 'generated' })
    })

    it('lets source text replace anything', () => {
      commitImport(db, bank([withText('generated', 'AI')]))
      const preview = plan(db, bank([withText('source', 'Book')]))
      expect(firstAction(preview)).toMatchObject({ action: 'updated', changes: ['explanations'] })

      commitImport(db, bank([withText('source', 'Book')]))
      expect(question()).toMatchObject({ explanationMd: 'Book (question)', explanationOrigin: 'source' })
    })

    it('never wipes text when the file has none', () => {
      commitImport(db, bank([withText('generated', 'AI')]))
      commitImport(db, bank([single()]))
      expect(question().explanationMd).toBe('AI (question)')
      expect(right().explanationMd).toBe('AI (option)')
    })
  })

  describe('source details', () => {
    const source = () => db.select().from(sources).get()!

    it('saves trust and reference from the file', () => {
      commitImport(db, bank([single()], { source: { name: 'Mock source', origin: 'upload', trust: 'official', reference: 'https://example.com' } }))
      expect(source()).toMatchObject({ trust: 'official', reference: 'https://example.com' })
    })

    it('counts a generated source as written by AI unless the file says otherwise', () => {
      commitImport(db, bank([single()], { source: { name: 'Mock source', origin: 'generated' } }))
      expect(source().trust).toBe('ai')
    })

    it('updates them from a later file, and keeps them when it leaves them out', () => {
      commitImport(db, bank([single()], { source: { name: 'Mock source', origin: 'upload', trust: 'third_party', reference: 'Book, 2nd edition' } }))
      commitImport(db, bank([single()]))
      expect(source()).toMatchObject({ trust: 'third_party', reference: 'Book, 2nd edition' })

      commitImport(db, bank([single()], { source: { name: 'Mock source', origin: 'upload', trust: 'official' } }))
      expect(source()).toMatchObject({ trust: 'official', reference: 'Book, 2nd edition' })
    })
  })

  describe('listSources and deleteSource', () => {
    it('lists each source with its counts, leaving out deleted questions', () => {
      commitImport(db, bank([single({ reviewNote: 'Check' }), single({ externalId: 'q2', bodyMd: 'Two?' }), single({ externalId: 'q3', bodyMd: 'Three?' })]))
      db.update(questions).set({ flaggedAt: new Date() }).where(eq(questions.externalId, 'q2')).run()
      db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.externalId, 'q3')).run()

      expect(listSources(db)).toEqual([
        {
          id: 1,
          exam: EXAM,
          name: 'Mock source',
          origin: 'upload',
          trust: null,
          reference: null,
          chapters: 1,
          questions: 2,
          flagged: 1,
          toReview: 1,
          attempts: 0,
        },
      ])
    })

    it('removes a source and everything in it, leaving other sources alone', () => {
      commitImport(db, bank([single()]))
      commitImport(db, bank([single({ externalId: 'x', bodyMd: 'Other?' })], { source: { name: 'Keep', origin: 'upload' } }))

      expect(deleteSource(db, 1)).toBe('deleted')
      expect(listSources(db).map((s) => s.name)).toEqual(['Keep'])
      expect(allQuestions()).toHaveLength(1)
      expect(allOptions()).toHaveLength(2)
    })

    it('refuses to remove a source with attempts', () => {
      commitImport(db, bank([single()]))
      const [question] = allQuestions()
      const quiz = db.insert(quizzes).values({ userId: 1, examId: 2, mode: 'study', config: { feedback: 'after_each', sourceId: 1 }, questionIds: [question!.id] }).returning().get()
      db.insert(attempts).values({ userId: 1, questionId: question!.id, quizId: quiz.id, selectedOptionIds: [], result: 'incorrect', kind: 'revealed' }).run()

      expect(listSources(db)[0]!.attempts).toBe(1)
      expect(deleteSource(db, 1)).toBe('has-attempts')
      expect(allQuestions()).toHaveLength(1)
    })

    it('reports a source that does not exist', () => {
      expect(deleteSource(db, 99)).toBe('not-found')
    })
  })

  describe('routes', () => {
    const post = (path: string, body: unknown) =>
      createApi(db).request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    it('previews, imports, lists and deletes', async () => {
      const preview = await post('/api/import/preview', { bank: bank([single()]) })
      expect(preview.status).toBe(200)
      expect(await preview.json()).toMatchObject({ ok: true, counts: { new: 1 } })

      const commit = await post('/api/import/commit', { bank: bank([single()]) })
      expect(await commit.json()).toMatchObject({ ok: true, added: 1 })

      const list = await createApi(db).request('/api/sources')
      expect(await list.json()).toMatchObject([{ name: 'Mock source', questions: 1 }])

      const removed = await createApi(db).request('/api/sources/1', { method: 'DELETE' })
      expect(removed.status).toBe(200)
      expect(listSources(db)).toEqual([])
    })

    it('returns problems with a 200 on preview, because the check itself worked', async () => {
      const res = await post('/api/import/preview', { bank: { nonsense: true } })
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ ok: false })
    })

    it('refuses to commit an invalid bank', async () => {
      const res = await post('/api/import/commit', { bank: { nonsense: true } })
      expect(res.status).toBe(422)
      expect(listSources(db)).toEqual([])
    })

    it.each([
      ['an unknown field', { bank: {}, surprise: true }],
      ['a limit of zero', { bank: {}, limit: 0 }],
      ['a fractional limit', { bank: {}, limit: 1.5 }],
    ])('rejects a commit body with %s', async (_name, body) => {
      expect((await post('/api/import/commit', body)).status).toBe(400)
    })

    it.each(['0', 'abc', '1.5'])('rejects a source ID of %s', async (id) => {
      expect((await createApi(db).request(`/api/sources/${id}`, { method: 'DELETE' })).status).toBe(400)
    })

    it('uses 404 and 409 when a source cannot be deleted', async () => {
      expect((await createApi(db).request('/api/sources/99', { method: 'DELETE' })).status).toBe(404)
    })
  })
})
