import { DEFAULT_PRIORITY_WEIGHTS, DEFAULT_QUIZ_DEFAULTS } from '../../shared/domain'
import type { Db } from './index'
import { and, eq, isNotNull } from 'drizzle-orm'
import { categories, exams, settings, subjects, userExams, users } from './schema'

type SeedExam = {
  subject: string
  exam: string
  /** What the exam covers, for anything that writes or sorts questions. */
  description?: string
  mockQuestionCount: number
  mockTimeLimitMin: number
  passMarkPct: number
  categories: { name: string; weight?: number; topics?: { name: string; weight?: number }[] }[]
}

/** The syllabus as Markdown, built from the categories, when they list their topics. */
export function syllabusMarkdown(item: SeedExam) {
  if (!item.categories.some((category) => category.topics)) return null
  return item.categories
    .map((category) => {
      const weight = category.weight === undefined ? '' : ` (${category.weight}%)`
      const topics = (category.topics ?? []).map((topic) => `  - ${topic.name}${topic.weight === undefined ? '' : ` (${topic.weight}%)`}`)
      return [`- **${category.name}**${weight}`, ...topics].join('\n')
    })
    .join('\n')
}

/**
 * OutSystems comes from its official exam detail sheet. Java and Claude are still drafts for
 * review, because their official pages couldn't be read when this was written (November 2026).
 *
 * This is the catalogue only. Question banks are loaded separately from Stage 4.
 */
export const SEED_EXAMS: SeedExam[] = [
  {
    // Oracle's exam topics as remembered, with no published weights. 50 questions, 120 minutes
    // and 68% come from candidate reports and prep sites.
    subject: 'Java',
    exam: 'Java SE 21 Developer Professional (1Z0-830)',
    mockQuestionCount: 50,
    mockTimeLimitMin: 120,
    passMarkPct: 68,
    categories: [
      { name: 'Handling Date, Time, Text, Numeric and Boolean Values' },
      { name: 'Controlling Program Flow' },
      { name: 'Using Object-Oriented Concepts in Java' },
      { name: 'Handling Exceptions' },
      { name: 'Working with Arrays and Collections' },
      { name: 'Working with Streams and Lambda Expressions' },
      { name: 'Packaging and Deploying Java Code' },
      { name: 'Managing Concurrent Code Execution' },
      { name: 'Using Java I/O API' },
      { name: 'Implementing Localization' },
    ],
  },
  {
    // From the OutSystems exam detail sheet.
    subject: 'OutSystems',
    exam: 'OutSystems Associate Developer (O11)',
    description:
      'The fundamentals of OutSystems 11 application development, common to web and mobile applications: data modeling, UI development, logic, screen lifecycle and modular architecture. Focuses on practical knowledge and scenarios. Multiple choice, and each question has only one correct answer.',
    mockQuestionCount: 50,
    mockTimeLimitMin: 120,
    passMarkPct: 70,
    categories: [
      {
        name: 'UI Design',
        weight: 26,
        topics: [
          { name: 'Screen Widgets', weight: 18 },
          { name: 'Blocks and Events', weight: 8 },
        ],
      },
      {
        name: 'Logic',
        weight: 22,
        topics: [
          { name: 'Client and Server Actions', weight: 4 },
          { name: 'Form Validations', weight: 8 },
          { name: 'Logic Flows & Exception Handling', weight: 10 },
        ],
      },
      {
        name: 'Fetching Data',
        weight: 20,
        topics: [
          { name: 'Aggregates', weight: 12 },
          { name: 'Fetching Data on Screens', weight: 8 },
        ],
      },
      {
        name: 'Reactive Apps in OutSystems',
        weight: 12,
        topics: [
          { name: 'Client Variables', weight: 2 },
          { name: 'Screen Lifecycle', weight: 6 },
          { name: 'Debugging and Monitoring', weight: 4 },
        ],
      },
      {
        name: 'Data Modeling',
        weight: 12,
        topics: [
          { name: 'Entities & Data Types', weight: 8 },
          { name: 'Data Relationships', weight: 4 },
        ],
      },
      {
        name: 'Architecture & Security',
        weight: 8,
        topics: [
          { name: 'Modular Dependencies', weight: 4 },
          { name: 'Role-based Security', weight: 4 },
        ],
      },
    ],
  },
  {
    // No Developer Professional exam could be found, so this borrows the nearest published
    // one, Claude Certified Developer - Foundations (CCDV-F), as reported by prep sites.
    // Its pass mark is 720 on a 100-1000 scale, so 72% is only an approximation.
    subject: 'Claude',
    exam: 'Claude Developer Professional',
    mockQuestionCount: 53,
    mockTimeLimitMin: 120,
    passMarkPct: 72,
    categories: [
      { name: 'Agents and Workflows', weight: 14.7 },
      { name: 'Applications and Integration', weight: 33.1 },
      { name: 'Claude Code', weight: 3.1 },
      { name: 'Evaluation, Testing and Debugging', weight: 2.6 },
      { name: 'Model Selection and Optimization', weight: 16.8 },
      { name: 'Prompt and Context Engineering', weight: 11 },
      { name: 'Security and Safety', weight: 8.1 },
      { name: 'Tools and MCPs', weight: 10.6 },
    ],
  },
]

/** Safe to run on every start: only adds what's missing, so later edits are kept. */
export function seed(db: Db) {
  db.transaction((tx) => {
    const admin =
      tx.select().from(users).limit(1).get() ??
      tx.insert(users).values({ name: 'Admin', role: 'admin' }).returning().get()

    if (!tx.select().from(settings).limit(1).get()) {
      tx.insert(settings)
        .values({
          userId: admin.id,
          priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
          quizDefaults: DEFAULT_QUIZ_DEFAULTS,
        })
        .run()
    }

    // All or nothing, so a renamed or deleted exam isn't added back on the next start.
    if (!tx.select().from(subjects).limit(1).get()) seedExams(tx)
    seedTopics(tx)
  })
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

function seedExams(tx: Tx) {
  const admin = tx.select().from(users).limit(1).get()!
  for (const item of SEED_EXAMS) {
    const subject = tx.insert(subjects).values({ name: item.subject }).returning().get()
    const exam = tx
      .insert(exams)
      .values({
        subjectId: subject.id,
        name: item.exam,
        descriptionMd: item.description ?? null,
        syllabusMd: syllabusMarkdown(item),
        mockQuestionCount: item.mockQuestionCount,
        mockTimeLimitMin: item.mockTimeLimitMin,
        passMarkPct: item.passMarkPct,
      })
      .returning()
      .get()
    tx.insert(userExams).values({ userId: admin.id, examId: exam.id }).run()
    tx.insert(categories)
      .values(item.categories.map((c) => ({ examId: exam.id, name: c.name, weight: c.weight ?? null })))
      .run()
  }
}

/**
 * Adds the official topics under their categories. Databases seeded before topics existed get them
 * too, but only while an exam has no topics at all, so ones removed later don't come back.
 */
function seedTopics(tx: Tx) {
  for (const item of SEED_EXAMS) {
    const exam = tx.select().from(exams).where(eq(exams.name, item.exam)).get()
    if (!exam) continue
    const hasTopics = tx
      .select()
      .from(categories)
      .where(and(eq(categories.examId, exam.id), isNotNull(categories.parentId)))
      .limit(1)
      .get()
    if (hasTopics) continue

    const existing = tx.select().from(categories).where(eq(categories.examId, exam.id)).all()
    for (const category of item.categories) {
      const parent = existing.find((row) => row.name === category.name)
      if (!parent) continue
      for (const topic of category.topics ?? []) {
        if (existing.some((row) => row.name === topic.name)) continue
        tx.insert(categories)
          .values({ examId: exam.id, parentId: parent.id, name: topic.name, weight: topic.weight ?? null })
          .run()
      }
    }
  }
}
