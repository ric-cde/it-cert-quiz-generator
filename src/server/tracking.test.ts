import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { commitImport } from './bank-import'
import { type Db, openDb } from './db'
import { attempts, options, questions, questionStats, quizzes, users } from './db/schema'
import { resolveReview } from './review'
import { isExactMatch, nextDifficulty, rebuildStats, recordAttempt, statsFromAttempts } from './tracking'

describe('nextDifficulty', () => {
  it.each([
    [null, false, 5],
    [null, true, 3],
    [5, false, 6],
    [5, true, 4],
    [10, false, 10],
    [0, true, 0],
    [0, false, 1],
    [10, true, 9],
  ])('from %s, when correct is %s, gives %s', (current, correct, expected) => {
    expect(nextDifficulty(current, correct)).toBe(expected)
  })
})

describe('isExactMatch', () => {
  it.each([
    [[1], [1], true],
    [[2], [1], false],
    [[1, 2], [2, 1], true],
    [[1], [1, 2], false],
    [[1, 2, 3], [1, 2], false],
    [[1, 3], [1, 2], false],
    [[], [1], false],
  ])('%j against %j is %s', (selected, correct, expected) => {
    expect(isExactMatch(selected, correct)).toBe(expected)
  })
})

describe('statsFromAttempts', () => {
  const at = (minute: number) => new Date(2026, 10, 4, 10, minute)

  it('starts empty', () => {
    expect(statsFromAttempts([])).toMatchObject({ difficulty: null, attemptCount: 0, latestCorrect: false, lastSeenAt: null })
  })

  it('follows a history of right and wrong', () => {
    const stats = statsFromAttempts([
      { result: 'incorrect', createdAt: at(1) },
      { result: 'correct', createdAt: at(2) },
      { result: 'correct', createdAt: at(3) },
    ])
    expect(stats).toEqual({
      difficulty: 3,
      attemptCount: 3,
      correctCount: 2,
      streak: 2,
      latestCorrect: true,
      everCorrect: true,
      lastSeenAt: at(3),
    })
  })

  it('resets the streak on a miss, but remembers it was once right', () => {
    const stats = statsFromAttempts([
      { result: 'correct', createdAt: at(1) },
      { result: 'incorrect', createdAt: at(2) },
    ])
    expect(stats).toMatchObject({ difficulty: 4, streak: 0, latestCorrect: false, everCorrect: true })
  })

  it('treats a partial as a miss, and ignores anything pending', () => {
    const stats = statsFromAttempts([
      { result: 'partial', createdAt: at(1) },
      { result: 'pending', createdAt: at(2) },
    ])
    expect(stats).toMatchObject({ difficulty: 5, attemptCount: 1, correctCount: 0, lastSeenAt: at(1) })
  })
})

describe('with stored attempts', () => {
  let db: Db
  let userId: number
  let quizId: number

  const bank = (correctText: string) => ({
    formatVersion: 1,
    exam: 'OutSystems Associate Developer (O11)',
    source: { name: 'Tracking', origin: 'upload' },
    chapters: [
      {
        name: 'One',
        questions: [
          {
            externalId: 'q1',
            type: 'single',
            category: 'Logic',
            bodyMd: 'Which one?',
            reviewNote: 'The answer looks wrong.',
            options: ['A', 'B', 'C'].map((bodyMd) => ({ bodyMd, isCorrect: bodyMd === correctText })),
          },
        ],
      },
    ],
  })

  const question = () => db.select().from(questions).get()!
  const optionId = (text: string) => db.select().from(options).where(eq(options.bodyMd, text)).get()!.id
  const stats = () => db.select().from(questionStats).where(eq(questionStats.questionId, question().id)).get()!
  const allAttempts = () => db.select().from(attempts).all()

  function record(selected: string[], result: 'correct' | 'incorrect', kind: 'answered' | 'revealed' = 'answered') {
    const quiz = db
      .insert(quizzes)
      .values({ userId, examId: 1, mode: 'study', config: { feedback: 'after_each', sourceId: 1 }, questionIds: [question().id] })
      .returning()
      .get()
    quizId = quiz.id
    db.transaction((tx) =>
      recordAttempt(tx, {
        userId,
        questionId: question().id,
        quizId,
        selectedOptionIds: selected.map(optionId),
        result,
        kind,
      }),
    )
  }

  beforeEach(() => {
    db = openDb(':memory:')
    userId = db.select().from(users).get()!.id
    commitImport(db, bank('A'))
  })

  it('updates the stats in step with the attempts', () => {
    record(['B'], 'incorrect')
    expect(stats()).toMatchObject({ difficulty: 5, attemptCount: 1, streak: 0, latestCorrect: false })

    record(['A'], 'correct')
    expect(stats()).toMatchObject({ difficulty: 4, attemptCount: 2, correctCount: 1, streak: 1, latestCorrect: true })
  })

  it('can rebuild the stats from nothing but the attempts', () => {
    record(['B'], 'incorrect')
    record(['A'], 'correct')
    const before = stats()

    db.delete(questionStats).run()
    db.transaction((tx) => rebuildStats(tx, userId, question().id))

    expect(stats()).toEqual(before)
  })

  describe('when the answer key changes', () => {
    it('re-marks past answers from a review, and recalculates', () => {
      record(['B'], 'incorrect')
      record(['A'], 'correct')
      expect(stats()).toMatchObject({ latestCorrect: true, difficulty: 4 })

      resolveReview(db, question().id, { action: 'change-answer', correctOptionIds: [optionId('B')] })

      expect(allAttempts().map((a) => a.result)).toEqual(['correct', 'incorrect'])
      expect(stats()).toMatchObject({ latestCorrect: false, everCorrect: true, correctCount: 1, difficulty: 4, streak: 0 })
    })

    it('keeps a reveal as a miss, whatever the new answer is', () => {
      record([], 'incorrect', 'revealed')
      resolveReview(db, question().id, { action: 'change-answer', correctOptionIds: [optionId('B')] })

      expect(allAttempts()[0]).toMatchObject({ result: 'incorrect', kind: 'revealed' })
      expect(stats()).toMatchObject({ latestCorrect: false, attemptCount: 1 })
    })

    it('re-marks past answers from a re-import, because the file wins', () => {
      record(['B'], 'incorrect')
      commitImport(db, bank('B'))

      expect(allAttempts()[0]).toMatchObject({ result: 'correct' })
      expect(stats()).toMatchObject({ latestCorrect: true, difficulty: 3 })
    })

    it('leaves attempts and stats alone when a re-import changes only the wording', () => {
      record(['B'], 'incorrect')
      const before = stats()
      commitImport(db, { ...bank('A'), chapters: [{ name: 'One', questions: [{ ...bank('A').chapters[0]!.questions[0]!, bodyMd: 'Which one, then?' }] }] })

      expect(question().bodyMd).toBe('Which one, then?')
      expect(stats()).toEqual(before)
    })
  })
})
