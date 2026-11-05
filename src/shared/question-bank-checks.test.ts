import { describe, expect, it } from 'vitest'
import type { QuestionBank } from './question-bank'
import {
  type ExamCatalogue,
  questionFingerprint,
  questionWarnings,
  unknownCategories,
  validateBank,
} from './question-bank-checks'

type Question = QuestionBank['chapters'][number]['questions'][number]

const catalogue: ExamCatalogue = [{ name: 'An exam', categories: ['Logic', 'UI'] }]

const single = (overrides: object = {}) =>
  ({
    externalId: 'q1',
    type: 'single',
    category: 'Logic',
    bodyMd: 'A question?',
    options: [
      { bodyMd: 'Right', isCorrect: true },
      { bodyMd: 'Wrong', isCorrect: false },
    ],
    ...overrides,
  }) as Question

const bank = (questions: object[], extra: object = {}) => ({
  formatVersion: 1,
  exam: 'An exam',
  source: { name: 'A source', origin: 'upload' },
  chapters: [{ name: 'One', questions }],
  ...extra,
})

const warningsFor = (raw: unknown) => {
  const result = validateBank(raw, catalogue)
  if (!result.ok) throw new Error(JSON.stringify(result.problems))
  return result.warnings
}

describe('validateBank problems', () => {
  it('says where a shape problem is, using the chapter name and ID', () => {
    const result = validateBank(bank([single({ options: [{ bodyMd: 'Only', isCorrect: true }] })]), catalogue)
    expect(result).toMatchObject({ ok: false, problems: [{ location: 'One, question 1 (q1), options' }] })
  })

  it('reports every shape problem, not only the first', () => {
    const result = validateBank(bank([single({ bodyMd: ' ' }), single({ externalId: 'q2', category: '' })]), catalogue)
    expect(result.ok === false && result.problems).toHaveLength(2)
  })

  it('copes with something that is not a bank at all', () => {
    for (const raw of [null, 5, [], { chapters: 'x' }, { chapters: [null] }]) {
      expect(validateBank(raw, catalogue).ok).toBe(false)
    }
  })

  it('rejects an unknown exam, and lists the valid names', () => {
    const result = validateBank({ ...bank([single()]), exam: 'Nope' }, catalogue)
    expect(result).toMatchObject({ ok: false, problems: [{ location: 'exam' }] })
    expect(result.ok === false && result.problems[0]?.message).toContain('"An exam"')
  })

  it('accepts a category the exam does not have, because the import screen asks where it goes', () => {
    const result = validateBank(bank([single({ category: 'Nope' })]), catalogue)
    expect(result.ok).toBe(true)
  })

  describe('unknownCategories', () => {
    const exam = { name: 'An exam', categories: ['Logic', 'UI'], topics: { UI: ['Widgets'] } }

    it('counts each unknown name once, treating categories and topics as known', () => {
      const parsed = validateBank(
        bank([
          single({ category: 'Nope' }),
          single({ externalId: 'q2', category: 'Nope' }),
          single({ externalId: 'q3', category: 'Widgets' }),
          single({ externalId: 'q4', category: 'UI' }),
        ]),
        catalogue,
      )
      if (!parsed.ok) throw new Error('should be valid')
      expect([...unknownCategories(parsed.bank, exam)]).toEqual([['Nope', 2]])
    })

    it('matches names exactly', () => {
      const parsed = validateBank(bank([single({ category: 'logic' })]), catalogue)
      if (!parsed.ok) throw new Error('should be valid')
      expect([...unknownCategories(parsed.bank, exam)]).toEqual([['logic', 1]])
    })
  })
})

describe('questionWarnings', () => {
  const fourOptions = [
    { bodyMd: 'One', isCorrect: true },
    { bodyMd: 'Two', isCorrect: true },
    { bodyMd: 'Three', isCorrect: false },
  ]

  it.each<[string, object, RegExp]>([
    ['a number left on the question', { bodyMd: '12. What is this?' }, /start with its number/],
    ['"Q7:" left on the question', { bodyMd: 'Q7: What is this?' }, /start with its number/],
    ['a markdown image', { bodyMd: 'What is this? ![a flow](x.png)' }, /image/],
    ['a reference to a diagram', { bodyMd: 'Look at the diagram below.' }, /image/],
    ['a reference to another question', { bodyMd: 'Using the previous question, what next?' }, /another question/],
    ['generics outside backticks', { bodyMd: 'Is List<String> valid?' }, /disappears/],
    ['a tag outside backticks', { bodyMd: 'Use the <div> element.' }, /disappears/],
    ['generics in an option', { options: [{ bodyMd: 'List<String>', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }, /disappears/],
    ['generics in an explanation', { options: [{ bodyMd: 'A thing', isCorrect: true, explanationMd: 'See Map<K, V>.' }, { bodyMd: 'No', isCorrect: false }] }, /disappears/],
    ['garbled characters', { bodyMd: 'Whatâ€™s this?' }, /garbled/],
    ['a ligature', { bodyMd: 'The ﬁrst one?' }, /garbled/],
    ['curly quotes in code', { bodyMd: '```java\nprint(“a”);\n```' }, /curly quotes/],
    ['a code block with no language', { bodyMd: '```\nint x;\n```' }, /doesn't name its language/],
    ['an unclosed code block', { bodyMd: '```java\nint x;' }, /never closed/],
    ['every option labelled', { options: [{ bodyMd: 'A. Yes', isCorrect: true }, { bodyMd: 'B. No', isCorrect: false }] }, /label/],
    ['labelled with brackets', { options: [{ bodyMd: '(a) Yes', isCorrect: true }, { bodyMd: '(b) No', isCorrect: false }] }, /label/],
    ['two identical options', { options: [{ bodyMd: 'Same', isCorrect: true }, { bodyMd: ' same ', isCorrect: false }] }, /same text/],
    ['a letter in an explanation', { options: [{ bodyMd: 'Yes', isCorrect: true, explanationMd: 'Better than option B.' }, { bodyMd: 'No', isCorrect: false }] }, /by letter/],
    ['"Both A and B"', { lockOptionOrder: true, options: [{ bodyMd: 'Both A and B', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }, /by letter/],
    ['"All of the above" with no lock', { options: [{ bodyMd: 'All of the above', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }, /lockOptionOrder/],
    ['"None of these" with no lock', { options: [{ bodyMd: 'None of these', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }, /lockOptionOrder/],
    ['the answer left in the question', { bodyMd: 'What is it? The correct answer is B.' }, /included in the question/],
    ['"Answer:" left in an option', { options: [{ bodyMd: 'Yes\n\nAnswer: yes', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }, /included in the question/],
    ['a correct option explained as wrong', { options: [{ bodyMd: 'Yes', isCorrect: true, explanationMd: 'Incorrect, because...' }, { bodyMd: 'No', isCorrect: false }] }, /misaligned/],
    ['a wrong option explained as correct', { options: [{ bodyMd: 'Yes', isCorrect: true }, { bodyMd: 'No', isCorrect: false, explanationMd: 'Correct! Because...' }] }, /misaligned/],
    ['an origin with no explanation', { options: [{ bodyMd: 'Yes', isCorrect: true, explanationOrigin: 'source' }, { bodyMd: 'No', isCorrect: false }] }, /explanationOrigin/],
    ['"choose two" on a single answer question', { bodyMd: 'Which? Choose two.' }, /asks for 2 answers, but 1/],
    ['"select all" on a single answer question', { bodyMd: 'Which? Select all that apply.' }, /type is "single"/],
    ['too few marked for "choose three"', { type: 'multi', bodyMd: 'Which? Choose 3.', options: fourOptions }, /asks for 3 answers, but 2/],
  ])('flags %s', (_name, overrides, expected) => {
    expect(questionWarnings(single(overrides)).join(' ')).toMatch(expected)
  })

  it.each<[string, object]>([
    ['a clean question', {}],
    ['generics inside backticks', { bodyMd: 'Is `List<String>` valid?' }],
    ['generics inside a code block', { bodyMd: '```java\nList<String> a;\n```' }],
    ['"choose two" with two marked', { type: 'multi', bodyMd: 'Which? Choose two.', options: fourOptions }],
    ['"choose" with no number', { bodyMd: 'Which would you choose first?' }],
    ['a locked "All of the above"', { lockOptionOrder: true, options: [{ bodyMd: 'All of the above', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }],
    ['a number that is part of the question', { bodyMd: '2 + 2 is what?' }],
    ['the image widget, in OutSystems', { bodyMd: 'What does the image widget display?' }],
    ['an image file', { bodyMd: 'Which entity stores the image file?' }],
    ['a capital letter that is not an option', { bodyMd: 'What does the Answer Set hold?' }],
    ['code with quotes and angle brackets in an option', { options: [{ bodyMd: '```java\nvar a = "<b>";\n```', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }],
    ['a four-backtick fence containing a fence', { bodyMd: '````markdown\n```\ncode\n```\n````' .replace('````markdown', '````markdown') }],
    ['an explanation starting "Correct!" on the right option', { options: [{ bodyMd: 'Yes', isCorrect: true, explanationMd: 'Correct! Because.' }, { bodyMd: 'No', isCorrect: false, explanationMd: 'Wrong, because.' }] }],
    ['options that happen to start with a number', { options: [{ bodyMd: '1 and 2', isCorrect: true }, { bodyMd: 'No', isCorrect: false }] }],
  ])('leaves alone %s', (_name, overrides) => {
    expect(questionWarnings(single(overrides))).toEqual([])
  })

  it('also checks free-form questions', () => {
    const question = { externalId: 'q1', type: 'free_form', category: 'Logic', bodyMd: 'Why?', modelAnswerMd: 'Because of List<T>.' }
    expect(questionWarnings(question as Question).join(' ')).toMatch(/disappears/)
  })
})

describe('warnings about the whole file', () => {
  const numbered = (numbers: number[]) => numbers.map((n) => single({ externalId: `set-q${n}`, bodyMd: `Question about ${'x'.repeat(n)}` }))

  it('reports a gap in the numbering, because a question may have been lost', () => {
    const warnings = warningsFor(bank(numbered([1, 2, 5])))
    expect(warnings).toEqual([{ location: 'One', message: expect.stringContaining('numbers 3, 4 are missing') }])
  })

  it('accepts a gap that is explained in omitted', () => {
    const omitted = [{ reference: 'Set 1, question 3', reason: 'Image' }, { reference: 'Q4', reason: 'Image' }]
    expect(warningsFor(bank(numbered([1, 2, 5]), { omitted }))).toEqual([])
  })

  it('reports a question repeated in the file', () => {
    const warnings = warningsFor(bank([single(), single({ externalId: 'q2' })]))
    expect(warnings).toEqual([{ location: 'One, question 2 (q2)', message: expect.stringContaining('same question as One, question 1') }])
  })

  const answeredAt = (positions: number[]) =>
    positions.map((position, index) =>
      single({
        externalId: `q${index + 1}`,
        bodyMd: `Question ${'x'.repeat(index + 1)}`,
        options: [0, 1, 2, 3].map((option) => ({ bodyMd: `Option ${option}`, isCorrect: option === position })),
      }),
    )

  it('reports the correct answer being in one position far too often', () => {
    const warnings = warningsFor(bank(answeredAt(Array<number>(12).fill(0))))
    expect(warnings).toEqual([{ location: 'The whole file', message: expect.stringContaining('option 1 in 12 of 12') }])
  })

  it('accepts answers that are spread out', () => {
    expect(warningsFor(bank(answeredAt([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3])))).toEqual([])
  })

  it('does not judge the spread with only a few questions', () => {
    expect(warningsFor(bank(answeredAt([0, 0, 0, 0])))).toEqual([])
  })
})

describe('questionFingerprint', () => {
  const options = [
    { bodyMd: 'One', isCorrect: true },
    { bodyMd: 'Two', isCorrect: false },
  ]

  it('ignores option order, spacing, case, and which is marked correct', () => {
    const reordered = single({ bodyMd: ' a   QUESTION? ', options: [{ bodyMd: 'two', isCorrect: true }, { bodyMd: 'ONE', isCorrect: false }] })
    expect(questionFingerprint(reordered)).toBe(questionFingerprint(single({ options })))
  })

  it('tells apart different questions with the same wording', () => {
    expect(questionFingerprint(single({ options }))).not.toBe(
      questionFingerprint(single({ options: [options[0], { bodyMd: 'Three', isCorrect: false }] })),
    )
  })
})
