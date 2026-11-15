import { and, asc, eq, isNull } from 'drizzle-orm'
import type { CategoryResult, QuizMark, QuizQuestion, QuizResults, QuizState, QuizSummary } from '../../shared/quiz'
import type { Db } from '../db'
import { categories, chapters, exams, options, questions, sources } from '../db/schema'
import { isStarred } from '../stars'
import { difficultyOf } from '../tracking'
import {
  askableIds,
  attemptsIn,
  type AttemptRow,
  categoriesOf,
  categoryLabel,
  findQuiz,
  inQuizOrder,
  liveQuestionIds,
  missedIds,
  parentCategories,
  type QuizRow,
  type Reader,
  settle,
} from './common'
import { labelOf } from './create'

/** A quiz as the screen shows it: the question it's on, or the results once it's finished. */

function resultsOf(quiz: QuizRow, history: AttemptRow[], live: Set<number>): QuizResults {
  const byQuestion = new Map(history.map((attempt) => [attempt.questionId, attempt]))
  const results: QuizResults = { correct: 0, incorrect: 0, revealed: 0, skipped: 0, notReached: 0 }
  quiz.questionIds.forEach((id, index) => {
    const attempt = byQuestion.get(id)
    if (attempt) {
      if (attempt.kind === 'revealed') results.revealed += 1
      else if (attempt.result === 'correct') results.correct += 1
      else results.incorrect += 1
    } else if (live.has(id)) {
      if (index < quiz.position) results.skipped += 1
      else results.notReached += 1
    }
  })
  return results
}

/**
 * How each question so far went, for the progress bar: those passed, and the current one once it's
 * locked. At-the-end feedback says only whether each was answered, never whether it was right.
 */
function marksOf(quiz: QuizRow, history: AttemptRow[]): QuizMark[] {
  const byQuestion = new Map(history.map((attempt) => [attempt.questionId, attempt]))
  const atEnd = quiz.config.feedback === 'at_end'
  const marks: QuizMark[] = []
  for (const [index, id] of quiz.questionIds.entries()) {
    const attempt = byQuestion.get(id)
    if (index > quiz.position || (index === quiz.position && (!attempt || atEnd))) break
    if (!attempt) marks.push('skipped')
    else if (atEnd) marks.push('answered')
    else marks.push(attempt.result === 'correct' ? 'correct' : 'incorrect')
  }
  return marks
}

function currentQuestion(db: Reader, quiz: QuizRow, questionId: number, attempt: AttemptRow | undefined): QuizQuestion {
  const row = db
    .select({ question: questions, source: sources.name, category: categories.name, parent: parentCategories.name })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(sources, eq(chapters.sourceId, sources.id))
    .innerJoin(categories, eq(questions.categoryId, categories.id))
    .leftJoin(parentCategories, eq(categories.parentId, parentCategories.id))
    .where(eq(questions.id, questionId))
    .get()!
  const { question } = row

  const rows = db
    .select()
    .from(options)
    .where(and(eq(options.questionId, questionId), isNull(options.deletedAt)))
    .orderBy(asc(options.position))
    .all()
  const ordered = inQuizOrder(quiz, question, rows)

  const locked = attempt !== undefined && quiz.config.feedback === 'after_each'
  const revealed = attempt?.kind === 'revealed'
  const inDoubt = question.reviewNote !== null && question.reviewedAt === null

  return {
    id: question.id,
    // Free-form questions can't reach here until Stage 14, because `selectable` leaves them out.
    type: question.type as QuizQuestion['type'],
    bodyMd: question.bodyMd,
    source: row.source,
    flag: question.flaggedAt ? { reason: question.flagReason } : null,
    starred: isStarred(db, quiz.userId, question.id),
    inDoubt,
    ...(locked && inDoubt ? { reviewNote: question.reviewNote! } : {}),
    ...(locked
      ? {
          category: categoryLabel(row.category, row.parent),
          explanationMd: question.explanationMd,
          difficulty: difficultyOf(db, quiz.userId, question.id),
        }
      : {}),
    outcome: locked
      ? {
          result: attempt.result === 'correct' ? 'correct' : 'incorrect',
          kind: attempt.kind,
          selectedOptionIds: attempt.selectedOptionIds,
        }
      : null,
    options: ordered.map((option) =>
      locked
        ? {
            id: option.id,
            label: option.label,
            bodyMd: option.bodyMd,
            isCorrect: option.isCorrect,
            // After a reveal only the correct answer's text shows.
            explanationMd: revealed && !option.isCorrect ? null : option.explanationMd,
          }
        : { id: option.id, label: option.label, bodyMd: option.bodyMd },
    ),
  }
}

/** How each category went, weakest first. Only questions that count towards the score are included. */
function byCategoryOf(db: Reader, quiz: QuizRow, history: AttemptRow[], live: Set<number>): CategoryResult[] {
  const byQuestion = new Map(history.map((attempt) => [attempt.questionId, attempt]))
  const counted = quiz.questionIds.filter((id, index) => byQuestion.has(id) || (live.has(id) && index < quiz.position))
  const names = categoriesOf(db, counted)

  const totals = new Map<string, CategoryResult>()
  for (const id of counted) {
    const name = names.get(id)?.top ?? 'Uncategorised'
    const entry = totals.get(name) ?? { name, correct: 0, asked: 0 }
    entry.asked += 1
    if (byQuestion.get(id)?.result === 'correct') entry.correct += 1
    totals.set(name, entry)
  }
  return [...totals.values()].sort((a, b) => a.correct / a.asked - b.correct / b.asked || a.name.localeCompare(b.name))
}

function summaryOf(db: Reader, quiz: QuizRow, history: AttemptRow[], live: Set<number>): QuizSummary {
  const askable = askableIds(db, quiz.questionIds)
  return {
    byCategory: byCategoryOf(db, quiz, history, live),
    missed: missedIds(quiz, history).filter((id) => askable.has(id)).length,
    examId: quiz.examId,
    label: labelOf(db, quiz),
  }
}

export function buildState(db: Reader, quiz: QuizRow): QuizState {
  const exam = db.select({ name: exams.name }).from(exams).where(eq(exams.id, quiz.examId)).get()!
  const history = attemptsIn(db, quiz.id)
  const base = {
    id: quiz.id,
    exam: exam.name,
    feedback: quiz.config.feedback,
    total: quiz.questionIds.length,
    position: quiz.position,
    marks: marksOf(quiz, history),
  }
  if (quiz.finishedAt) {
    const live = liveQuestionIds(db, quiz.questionIds)
    const results = resultsOf(quiz, history, live)
    return { ...base, finished: true, current: null, results, summary: summaryOf(db, quiz, history, live) }
  }
  const id = quiz.questionIds[quiz.position]!
  const attempt = history.find((item) => item.questionId === id)
  return { ...base, finished: false, current: currentQuestion(db, quiz, id, attempt), results: null, summary: null }
}

export function getQuizState(db: Db, userId: number, quizId: number): QuizState | null {
  return db.transaction((tx) => {
    const quiz = findQuiz(tx, userId, quizId)
    return quiz ? buildState(tx, settle(tx, quiz)) : null
  })
}
