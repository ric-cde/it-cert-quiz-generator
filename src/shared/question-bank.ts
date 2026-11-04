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

const optionSchema = z.strictObject({
  bodyMd: text('The answer text in Markdown. Leave out labels such as "A." or "1)", because options get shuffled.'),
  isCorrect: z.boolean().describe('Whether this option is a correct answer.'),
  explanationMd: text(
    'Optional text shown with this option after answering. For a wrong option, say why it is wrong in 1-3 sentences. For a correct option, say why it is right in 1-2 sentences. Leave it out rather than inventing filler.',
  ).optional(),
  explanationOrigin: z
    .enum(['source', 'generated'])
    .describe(
      'Who wrote explanationMd. "source" (assumed if left out) means it came from the source material. "generated" means an AI wrote it, so the app may later replace it when asked.',
    )
    .optional(),
})

const questionFields = {
  externalId: text(
    'A stable ID, unique within this source, such as "boyarsky-ch3-q12". Loading a file again updates the question with the same ID and keeps its history, so never reuse an ID for a different question.',
  ),
  category: text("The category this question belongs to. Must exactly match a name from the exam's category list."),
  bodyMd: text(
    'The question in Markdown, with code in fenced blocks that name the language, such as ```java. Include instructions such as "Choose two." Don\'t include the question number or the options.',
  ),
}

const lockOptionOrder = z
  .boolean()
  .describe(
    'Set to true only if the option order matters, for example with "All of the above". Otherwise leave it out, and options are shuffled.',
  )
  .optional()

const singleQuestionSchema = z.strictObject({
  ...questionFields,
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
      'One source of exam questions for a quiz app. Text is Markdown, and raw HTML is not rendered. Convert questions faithfully: keep their wording, code and any existing explanations, and never guess an answer the source does not give. Leave out any question whose correct answer is unknown, and list it in omitted. Beyond this schema, externalId values and chapter names must each be unique within the file, and every category must match the exam\'s list exactly. Output only the JSON.',
  })

export type QuestionBank = z.infer<typeof questionBankSchema>

export function questionBankJsonSchema() {
  return z.toJSONSchema(questionBankSchema, { target: 'draft-2020-12', io: 'input' })
}
