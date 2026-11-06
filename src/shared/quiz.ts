import { z } from 'zod'
import { type Feedback, FEEDBACK_MODES, QUIZ_SORTS } from './domain'
import { selectionSchema } from './selection'

/** Taking a quiz: request bodies, and the state the server sends back after every action. */

const id = z.number().int().positive()
const durationMs = z.number().int().nonnegative().optional()

/** Starts a quiz from the take-exam screen. With no tiles, it draws from the whole exam. */
export const createQuizBody = selectionSchema.extend({
  examId: id,
  feedback: z.enum(FEEDBACK_MODES),
  /** Leave it out for Max. A cap above what's available is capped by it. */
  limit: id.optional(),
  /**
   * Random shuffles, then caps. Source order keeps the order of the source's chapters and questions,
   * and a cap takes the first ones, for working through a practice exam in sequence.
   */
  sort: z.enum(QUIZ_SORTS).default('random'),
})
export type CreateQuizBody = z.output<typeof createQuizBody>

// Sending the question as well means a second press can't act on the question after it.
export const answerBody = z.strictObject({ questionId: id, selectedOptionIds: z.array(id).min(1), durationMs })
export const revealBody = z.strictObject({ questionId: id, durationMs })
export const nextBody = z.strictObject({ questionId: id })

export const flagBody = z.strictObject({ reason: z.string().trim().max(500).optional() })

export type QuizQuestionOption = {
  id: number
  bodyMd: string
  /** These two stay on the server until the question is locked. */
  isCorrect?: boolean
  explanationMd?: string | null
}

export type QuizQuestion = {
  id: number
  type: 'single' | 'multi'
  bodyMd: string
  source: string
  options: QuizQuestionOption[]
  flag: { reason: string | null } | null
  /** The answer is in doubt and nobody has settled it yet. */
  inDoubt: boolean
  /** The note can give the answer away, so it stays on the server until the question is locked. */
  reviewNote?: string
  /** The category is a hint, so it also waits until the question is locked. A topic shows its category too. */
  category?: string
  /** Text about the whole question, once locked. */
  explanationMd?: string | null
  outcome: { result: 'correct' | 'incorrect'; kind: 'answered' | 'revealed'; selectedOptionIds: number[] } | null
}

export type QuizResults = {
  correct: number
  incorrect: number
  revealed: number
  skipped: number
  notReached: number
}

/** One category's share of a finished quiz. Topics count towards their category. */
export type CategoryResult = { name: string; correct: number; asked: number }

export type QuizSummary = {
  byCategory: CategoryResult[]
  /** Incorrect, revealed and skipped questions that can still be asked, for Retry missed. */
  missed: number
  examId: number
  label: string
}

export type ReviewOutcome = 'correct' | 'incorrect' | 'revealed' | 'skipped'

/** One question in the Review answers list, with everything about it now that the quiz is over. */
export type ReviewEntry = {
  number: number
  questionId: number
  type: 'single' | 'multi'
  bodyMd: string
  source: string
  category: string
  outcome: ReviewOutcome
  options: { id: number; bodyMd: string; isCorrect: boolean; chosen: boolean; explanationMd: string | null }[]
  explanationMd: string | null
  reviewNote: string | null
}

export type QuizState = {
  id: number
  exam: string
  feedback: Feedback
  total: number
  position: number
  finished: boolean
  current: QuizQuestion | null
  results: QuizResults | null
  /** Set once the quiz is finished. */
  summary: QuizSummary | null
}
