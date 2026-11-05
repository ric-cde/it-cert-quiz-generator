import { z } from 'zod'
import { type Feedback, FEEDBACK_MODES } from './domain'

/** Taking a quiz: request bodies, and the state the server sends back after every action. */

const id = z.number().int().positive()
const durationMs = z.number().int().nonnegative().optional()

export const createQuizBody = z.strictObject({
  sourceId: id,
  feedback: z.enum(FEEDBACK_MODES),
  limit: id.optional(),
})

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

export type QuizState = {
  id: number
  exam: string
  feedback: Feedback
  total: number
  position: number
  finished: boolean
  current: QuizQuestion | null
  results: QuizResults | null
}

export type StartableSource = { id: number; exam: string; name: string; available: number }
export type UnfinishedQuiz = {
  id: number
  exam: string
  source: string
  feedback: Feedback
  position: number
  total: number
}
export type QuizStartOptions = { sources: StartableSource[]; unfinished: UnfinishedQuiz[] }
