import { DEFAULT_PRIORITY_WEIGHTS, DEFAULT_QUIZ_DEFAULTS } from '../../shared/domain'
import type { Db } from './index'
import { categories, exams, settings, subjects, userExams, users } from './schema'

type SeedExam = {
  subject: string
  exam: string
  mockQuestionCount: number
  mockTimeLimitMin: number
  passMarkPct: number
  categories: { name: string; weight?: number }[]
}

/**
 * Drafts for review, not confirmed facts. The official pages couldn't all be read when this
 * was written (November 2026), so check these against each vendor's current exam guide.
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
    // OutSystems lists 120 minutes. The rest comes from a third-party study guide that cites
    // the OutSystems blueprint. The Exam Detail Sheet, seen when registering, is authoritative.
    subject: 'OutSystems',
    exam: 'OutSystems Associate Developer (O11)',
    mockQuestionCount: 50,
    mockTimeLimitMin: 120,
    passMarkPct: 70,
    categories: [
      { name: 'UI Design', weight: 26 },
      { name: 'Logic', weight: 22 },
      { name: 'Fetching Data', weight: 20 },
      { name: 'Reactive Apps in OutSystems', weight: 12 },
      { name: 'Data Modeling', weight: 12 },
      { name: 'Architecture & Security', weight: 8 },
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
    if (tx.select().from(subjects).limit(1).get()) return

    for (const item of SEED_EXAMS) {
      const subject = tx.insert(subjects).values({ name: item.subject }).returning().get()
      const exam = tx
        .insert(exams)
        .values({
          subjectId: subject.id,
          name: item.exam,
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
  })
}
