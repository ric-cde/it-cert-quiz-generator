import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PRIORITY_WEIGHTS, DEFAULT_QUIZ_DEFAULTS } from '../../shared/domain'
import { type Db, openDb } from './index'
import {
  attempts,
  categories,
  chapters,
  exams,
  explanations,
  options,
  questions,
  questionStats,
  quizzes,
  settings,
  sources,
  subjects,
  userExams,
  users,
} from './schema'
import { SEED_EXAMS } from './seed'

describe('seed', () => {
  let db: Db
  beforeEach(() => {
    db = openDb(':memory:')
  })

  it('adds the admin, three subjects and an exam for each', () => {
    expect(db.select().from(users).all()).toEqual([{ id: 1, name: 'Admin', role: 'admin' }])
    expect(
      db
        .select()
        .from(subjects)
        .all()
        .map((s) => s.name),
    ).toEqual(['Java', 'OutSystems', 'Claude'])
    expect(db.select().from(exams).all()).toHaveLength(3)
  })

  it('gives every exam its categories and complete mock settings', () => {
    for (const exam of db.select().from(exams).all()) {
      const seeded = SEED_EXAMS.find((item) => item.exam === exam.name)!
      const rows = db.select().from(categories).where(eq(categories.examId, exam.id)).orderBy(categories.id).all()

      expect(rows.map((c) => c.name)).toEqual(seeded.categories.map((c) => c.name))
      expect(exam.mockQuestionCount).toBeGreaterThan(0)
      expect(exam.mockTimeLimitMin).toBeGreaterThan(0)
      expect(exam.passMarkPct).toBeGreaterThan(0)
    }
  })

  it('has category weights that add up to 100 wherever an exam has them', () => {
    for (const item of SEED_EXAMS) {
      const weights = item.categories.flatMap((c) => (c.weight === undefined ? [] : [c.weight]))
      if (weights.length === 0) continue
      expect(weights).toHaveLength(item.categories.length)
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    }
  })

  it('links the admin to each exam, with no exam date yet', () => {
    const rows = db.select().from(userExams).all()
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.userId === 1 && row.examDate === null)).toBe(true)
  })

  it('stores default settings for the admin', () => {
    expect(db.select().from(settings).all()).toEqual([
      { userId: 1, priorityWeights: DEFAULT_PRIORITY_WEIGHTS, quizDefaults: DEFAULT_QUIZ_DEFAULTS, syntaxHighlighting: true },
    ])
  })

  it('adds no sources or questions, because question banks are loaded later', () => {
    expect(db.select().from(sources).all()).toEqual([])
    expect(db.select().from(chapters).all()).toEqual([])
    expect(db.select().from(questions).all()).toEqual([])
  })
})

describe('reopening the database', () => {
  it('keeps edits, and does not add seed rows again', () => {
    const dir = mkdtempSync(join(tmpdir(), 'quiz-'))
    const file = join(dir, 'quiz.db')
    try {
      const first = openDb(file)
      first.update(exams).set({ name: 'Renamed' }).where(eq(exams.id, 1)).run()
      first.$client.close()

      const second = openDb(file)
      const names = second
        .select()
        .from(exams)
        .all()
        .map((e) => e.name)
      const counts = [users, subjects, settings, userExams].map((t) => second.select().from(t).all().length)
      second.$client.close()

      expect(names[0]).toBe('Renamed')
      expect(names).toHaveLength(3)
      expect(counts).toEqual([1, 3, 1, 3])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

/** Sample rows made up for the test. Nothing here comes from a real question bank. */
function addMockQuestion(db: Db) {
  const source = db.insert(sources).values({ examId: 1, name: 'Mock source', origin: 'upload' }).returning().get()
  const chapter = db.insert(chapters).values({ sourceId: source.id, name: 'Mock chapter' }).returning().get()
  const question = db
    .insert(questions)
    .values({ chapterId: chapter.id, categoryId: 1, type: 'single', bodyMd: 'Mock?', contentHash: 'hash' })
    .returning()
    .get()
  return { source, chapter, question }
}

describe('schema', () => {
  let db: Db
  beforeEach(() => {
    db = openDb(':memory:')
  })

  it('stores a question through to an attempt, with typed values intact', () => {
    const { question } = addMockQuestion(db)
    const option = db
      .insert(options)
      .values({ questionId: question.id, bodyMd: 'Yes', isCorrect: true, position: 0 })
      .returning()
      .get()
    const quiz = db
      .insert(quizzes)
      .values({ userId: 1, examId: 1, mode: 'study', config: { max: 20 }, questionIds: [question.id] })
      .returning()
      .get()
    const attempt = db
      .insert(attempts)
      .values({
        userId: 1,
        questionId: question.id,
        quizId: quiz.id,
        selectedOptionIds: [option.id],
        result: 'correct',
        kind: 'answered',
      })
      .returning()
      .get()

    expect(question.lockOptionOrder).toBe(false)
    expect(option.isCorrect).toBe(true)
    expect(quiz.config).toEqual({ max: 20 })
    expect(quiz.questionIds).toEqual([question.id])
    expect(quiz.startedAt).toBeInstanceOf(Date)
    expect(attempt.selectedOptionIds).toEqual([option.id])
    expect(attempt.createdAt).toBeInstanceOf(Date)
  })

  it('rejects a question in a chapter that does not exist', () => {
    expect(() =>
      db
        .insert(questions)
        .values({ chapterId: 999, categoryId: 1, type: 'single', bodyMd: 'x', contentHash: 'x' })
        .run(),
    ).toThrow(/FOREIGN KEY/)
  })

  it('will not delete a question that has attempt history', () => {
    const { question } = addMockQuestion(db)
    const quiz = db
      .insert(quizzes)
      .values({ userId: 1, examId: 1, mode: 'study', config: {}, questionIds: [question.id] })
      .returning()
      .get()
    db.insert(attempts)
      .values({
        userId: 1,
        questionId: question.id,
        quizId: quiz.id,
        selectedOptionIds: [],
        result: 'incorrect',
        kind: 'revealed',
      })
      .run()

    expect(() => db.delete(questions).where(eq(questions.id, question.id)).run()).toThrow(/FOREIGN KEY/)
  })

  it.each([0, 6])('rejects a source rating of %i', (rating) => {
    expect(() => db.insert(sources).values({ examId: 1, name: 'x', origin: 'upload', rating }).run()).toThrow(/CHECK/)
  })

  it.each([1, 5, null])('accepts a source rating of %s', (rating) => {
    expect(() =>
      db.insert(sources).values({ examId: 1, name: `rated ${rating}`, origin: 'upload', rating }).run(),
    ).not.toThrow()
  })

  it.each([-1, 11])('rejects a difficulty of %i', (difficulty) => {
    const { question } = addMockQuestion(db)
    expect(() => db.insert(questionStats).values({ userId: 1, questionId: question.id, difficulty }).run()).toThrow(
      /CHECK/,
    )
  })

  it.each([0, 10, null])('accepts a difficulty of %s, where null means unset', (difficulty) => {
    const { question } = addMockQuestion(db)
    expect(() =>
      db.insert(questionStats).values({ userId: 1, questionId: question.id, difficulty }).run(),
    ).not.toThrow()
  })

  it('allows one stored explanation per question', () => {
    const { question } = addMockQuestion(db)
    const row = { questionId: question.id, bodyMd: 'Because', sources: [], model: 'mock-model' }
    db.insert(explanations).values(row).run()
    expect(() => db.insert(explanations).values(row).run()).toThrow(/UNIQUE/)
  })
})
