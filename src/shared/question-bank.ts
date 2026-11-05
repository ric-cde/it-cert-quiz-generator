import { z } from 'zod'

/**
 * The canonical question bank format. Every way of getting questions in ends here.
 *
 * `docs/question-bank.schema.json` is generated from this file with `npm run bank:schema`,
 * and a test fails if the two differ. JSON Schema can't express everything: the checks marked
 * "Import only" run when a file is loaded, as do checks against the exam's list of categories.
 */

const text = (description: string) => z.string().regex(/\S/).describe(description)

const IS_CORRECT = { type: 'object', properties: { isCorrect: { const: true } }, required: ['isCorrect'] }

const countCorrect = (options: { isCorrect: boolean }[]) => options.filter((option) => option.isCorrect).length

const explanationOrigin = z
  .enum(['source', 'generated'])
  .describe(
    'Who wrote the explanation. "source" (assumed if left out) means it came from the source material. "generated" means an AI wrote it, so the app may later replace it when asked, and never lets it replace source text.',
  )
  .optional()

const optionSchema = z.strictObject({
  bodyMd: text('The answer text in Markdown. Leave out labels such as "A." or "1)", because options get shuffled.'),
  isCorrect: z.boolean().describe('Whether this option is a correct answer.'),
  explanationMd: text(
    'Optional text shown with this option after answering. For a wrong option, say why it is wrong in 1-3 sentences. For a correct option, say why it is right in 1-2 sentences. Leave it out rather than inventing filler.',
  ).optional(),
  explanationOrigin,
})

const questionFields = {
  externalId: text(
    'Recommended. A short stable ID you make up from where the question sits in the source, such as "pe1-q17". It only has to be unique within the source. Loading a file again updates the question with the same ID and keeps its history, even if the wording was corrected, so never reuse an ID for a different question. If left out, the app matches on the question text instead, so a question whose wording changes is treated as new.',
  ).optional(),
  category: text(
    "The category this question belongs to. Use the exam's own category or topic name where one fits, spelled exactly. Another name is allowed when none fits, and the import screen asks where it goes.",
  ),
  bodyMd: text(
    'The question in Markdown, with code in fenced blocks that name the language, such as ```java. Include instructions such as "Choose two." Don\'t include the question number or the options.',
  ),
  reviewNote: text(
    'Optional. A note for a person to check, such as "The source says B, but the code does not compile". The question stays in quizzes with a warning, and is listed for review after import. Use it only for real doubts.',
  ).optional(),
}

const lockOptionOrder = z
  .boolean()
  .describe(
    'Set to true only if the option order matters, for example with "All of the above" or True/False. Otherwise leave it out, and options are shuffled.',
  )
  .optional()

/** Multiple choice only. Free-form questions explain themselves in their model answer. */
const questionExplanation = {
  explanationMd: text(
    'Optional text about the question as a whole, shown below the options after answering. Use it for a source\'s single explanation that covers the question rather than one option. Per-option text can be used as well, or instead.',
  ).optional(),
  explanationOrigin,
}

const singleQuestionSchema = z.strictObject({
  ...questionFields,
  ...questionExplanation,
  type: z.literal('single').describe('Exactly one correct option, shown as radio buttons.'),
  lockOptionOrder,
  options: z
    .array(optionSchema)
    .min(2)
    .refine((options) => countCorrect(options) === 1, 'A single answer question needs exactly one correct option')
    .meta({ contains: IS_CORRECT, minContains: 1, maxContains: 1 }),
})

const multiQuestionSchema = z.strictObject({
  ...questionFields,
  ...questionExplanation,
  type: z
    .literal('multi')
    .describe(
      'One or more correct options, shown as checkboxes, for "choose two" or "all that apply". Correct only if the selection matches exactly.',
    ),
  lockOptionOrder,
  options: z
    .array(optionSchema)
    .min(2)
    .refine((options) => countCorrect(options) >= 1, 'A multi-answer question needs at least one correct option')
    .meta({ contains: IS_CORRECT, minContains: 1 }),
})

const freeFormQuestionSchema = z.strictObject({
  ...questionFields,
  type: z.literal('free_form').describe('Answered in free text, and judged against the model answer. Has no options.'),
  modelAnswerMd: text('The answer to judge against, in Markdown, covering the key points a good answer must make.'),
})

const questionSchema = z.discriminatedUnion('type', [singleQuestionSchema, multiQuestionSchema, freeFormQuestionSchema])

const chapterSchema = z.strictObject({
  name: text('A chapter, or any other grouping within the source, such as "Chapter 3" or "Practice exam 1".'),
  questions: z.array(questionSchema).min(1),
})

const omittedSchema = z.strictObject({
  reference: text('Where the question was in the source, such as "Practice exam 1, question 17".'),
  reason: text('Why it was left out, such as "Depends on an image".'),
})

export const questionBankSchema = z
  .strictObject({
    $schema: z.string().describe('Optional location of this schema, which lets editors check the file.').optional(),
    formatVersion: z.literal(1).describe('The version of this format. Always 1.'),
    exam: text('The name of the exam, exactly as it appears in the app.'),
    source: z
      .strictObject({
        name: text('Where the questions come from, such as "Boyarsky study guide". Each source gets its own quality rating in the app.'),
        origin: z
          .enum(['upload', 'generated'])
          .describe('"upload" for questions converted from existing material. "generated" for questions an AI wrote.'),
        trust: z
          .enum(['official', 'third_party', 'ai'])
          .describe(
            'Optional. "official" for the exam vendor\'s own material, such as its sample exam. "third_party" for anyone else\'s, such as a study guide. "ai" for questions an AI wrote. Left out, generated sources count as "ai".',
          )
          .optional(),
        reference: text(
          'Optional. Where the source can be found: a URL, or a book with its edition and year, and the date it was retrieved.',
        ).optional(),
      })
      .describe('A single source. Use one file per source.'),
    chapters: z.array(chapterSchema).min(1),
    omitted: z
      .array(omittedSchema)
      .describe('Questions deliberately left out. Images are not supported, so list any question that depends on one here instead of including it.')
      .optional(),
  })
  .superRefine((bank, ctx) => {
    // Import only: JSON Schema can't compare values across an array.
    const seenIds = new Set<string>()
    const seenChapters = new Set<string>()
    bank.chapters.forEach((chapter, chapterIndex) => {
      if (seenChapters.has(chapter.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['chapters', chapterIndex, 'name'],
          message: `Chapter name "${chapter.name}" is used more than once`,
        })
      }
      seenChapters.add(chapter.name)

      chapter.questions.forEach((question, questionIndex) => {
        if (question.externalId === undefined) return
        if (seenIds.has(question.externalId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['chapters', chapterIndex, 'questions', questionIndex, 'externalId'],
            message: `externalId "${question.externalId}" is used more than once`,
          })
        }
        seenIds.add(question.externalId)
      })
    })
  })
  .meta({
    title: 'Question bank',
    description:
      'One source of exam questions for a quiz app. Text is Markdown, and raw HTML is not rendered. Convert questions faithfully: keep their wording, code and any existing explanations, and never guess an answer the source does not give. Leave out any question whose correct answer is unknown, and list it in omitted. Options are shuffled, so never refer to one by letter or position. Beyond this schema, externalId values and chapter names must each be unique within the file, and categories should use the exam\'s own names where one fits. Output only the JSON.',
  })

export type QuestionBank = z.infer<typeof questionBankSchema>

export function questionBankJsonSchema() {
  return z.toJSONSchema(questionBankSchema, { target: 'draft-2020-12', io: 'input' })
}
