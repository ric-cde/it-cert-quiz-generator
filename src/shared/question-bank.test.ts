import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { questionBankJsonSchema, questionBankSchema } from './question-bank'

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>

const publishedSchema = readJson('docs/question-bank.schema.json')
const example = readJson('docs/question-bank.example.json')
const matchesPublishedSchema = new Ajv2020({ strict: false }).compile(publishedSchema)

const option = (isCorrect: boolean, bodyMd = 'An option') => ({ bodyMd, isCorrect })
const single = {
  externalId: 'q1',
  type: 'single',
  category: 'Logic',
  bodyMd: 'A question?',
  options: [option(true), option(false)],
}
const bankWith = (question: object, extra: object = {}) => ({
  formatVersion: 1,
  exam: 'An exam',
  source: { name: 'A source', origin: 'upload' },
  chapters: [{ name: 'A chapter', questions: [question] }],
  ...extra,
})

describe('published files', () => {
  it('the JSON Schema is up to date. If not, run `npm run bank:schema`', () => {
    expect(publishedSchema).toEqual(JSON.parse(JSON.stringify(questionBankJsonSchema())))
  })

  it('the example is valid under both', () => {
    expect(questionBankSchema.safeParse(example).error).toBeUndefined()
    expect(matchesPublishedSchema(example), JSON.stringify(matchesPublishedSchema.errors)).toBe(true)
  })

  it('the example shows every question type', () => {
    const { chapters } = questionBankSchema.parse(example)
    const types = new Set(chapters.flatMap((chapter) => chapter.questions.map((question) => question.type)))
    expect([...types].sort()).toEqual(['free_form', 'multi', 'single'])
  })
})

describe.each<[string, object]>([
  ['a minimal single answer question', bankWith(single)],
  ['a multi-answer question with one correct option', bankWith({ ...single, type: 'multi' })],
  ['a multi-answer question where all are correct', bankWith({ ...single, type: 'multi', options: [option(true), option(true)] })],
  ['option text and a locked order', bankWith({ ...single, lockOptionOrder: true, options: [{ ...option(true), explanationMd: 'Why', explanationOrigin: 'source' }, option(false)] })],
  ['a free-form question', bankWith({ externalId: 'q1', type: 'free_form', category: 'Logic', bodyMd: 'Why?', modelAnswerMd: 'Because' })],
  ['a question with no externalId', bankWith({ type: 'single', category: 'Logic', bodyMd: 'x', options: single.options })],
  ['a review note', bankWith({ ...single, reviewNote: 'The source says B, but the code does not compile.' })],
  ['a $schema link and omitted questions', bankWith(single, { $schema: './question-bank.schema.json', omitted: [{ reference: 'Q2', reason: 'Depends on an image' }] })],
])('accepts %s', (_name, bank) => {
  it('under both schemas', () => {
    expect(questionBankSchema.safeParse(bank).success).toBe(true)
    expect(matchesPublishedSchema(bank), JSON.stringify(matchesPublishedSchema.errors)).toBe(true)
  })
})

describe.each<[string, object]>([
  ['a single answer question with two correct options', bankWith({ ...single, options: [option(true), option(true)] })],
  ['a single answer question with no correct option', bankWith({ ...single, options: [option(false), option(false)] })],
  ['a multi-answer question with no correct option', bankWith({ ...single, type: 'multi', options: [option(false), option(false)] })],
  ['only one option', bankWith({ ...single, options: [option(true)] })],
  ['options on a free-form question', bankWith({ ...single, type: 'free_form', modelAnswerMd: 'Because' })],
  ['a free-form question with no model answer', bankWith({ externalId: 'q1', type: 'free_form', category: 'Logic', bodyMd: 'Why?' })],
  ['a multiple choice question with no options', bankWith({ externalId: 'q1', type: 'single', category: 'Logic', bodyMd: 'Why?' })],
  ['an unknown question type', bankWith({ ...single, type: 'matching' })],
  ['a question with no category', bankWith({ externalId: 'q1', type: 'single', bodyMd: 'x', options: single.options })],
  ['a blank question', bankWith({ ...single, bodyMd: '   ' })],
  ['an unknown field on a question', bankWith({ ...single, difficulty: 5 })],
  ['an unknown field on an option', bankWith({ ...single, options: [{ ...option(true), letter: 'A' }, option(false)] })],
  ['an unknown top-level field', bankWith(single, { categories: [] })],
  ['the wrong format version', bankWith(single, { formatVersion: 2 })],
  ['no chapters', bankWith(single, { chapters: [] })],
  ['an empty chapter', bankWith(single, { chapters: [{ name: 'A chapter', questions: [] }] })],
  ['an unknown source origin', bankWith(single, { source: { name: 'A source', origin: 'import' } })],
])('rejects %s', (_name, bank) => {
  it('under both schemas', () => {
    expect(questionBankSchema.safeParse(bank).success).toBe(false)
    expect(matchesPublishedSchema(bank)).toBe(false)
  })
})

describe('checks only made on import', () => {
  it('rejects an externalId used twice, even across chapters', () => {
    const result = questionBankSchema.safeParse(
      bankWith(single, {
        chapters: [
          { name: 'One', questions: [single] },
          { name: 'Two', questions: [single] },
        ],
      }),
    )
    expect(result.error?.issues[0]?.message).toBe('externalId "q1" is used more than once')
  })

  it('allows any number of questions with no externalId', () => {
    const { externalId: _, ...noId } = single
    const result = questionBankSchema.safeParse(bankWith(single, { chapters: [{ name: 'One', questions: [noId, noId] }] }))
    expect(result.success).toBe(true)
  })

  it('rejects a chapter name used twice', () => {
    const result = questionBankSchema.safeParse(
      bankWith(single, {
        chapters: [
          { name: 'One', questions: [single] },
          { name: 'One', questions: [{ ...single, externalId: 'q2' }] },
        ],
      }),
    )
    expect(result.error?.issues[0]?.message).toBe('Chapter name "One" is used more than once')
  })
})
