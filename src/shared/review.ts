import { z } from 'zod'
import type { QUESTION_TYPES } from './domain'

/** Reviewing questions that came in with a doubt about them, such as an answer that looks wrong. */

export const reviewDecisionSchema = z.discriminatedUnion('action', [
  /** The question is fine as it stands. */
  z.strictObject({ action: z.literal('keep') }),
  /** The doubt was right, so the marked answer changes. */
  z.strictObject({ action: z.literal('change-answer'), correctOptionIds: z.array(z.number().int().positive()).min(1) }),
  /** The question is too unreliable to practise with, so it's flagged and leaves quizzes. */
  z.strictObject({ action: z.literal('take-out') }),
])

export type ReviewDecision = z.infer<typeof reviewDecisionSchema>

export type QuestionToReview = {
  id: number
  exam: string
  source: string
  sourceId: number
  chapter: string
  type: (typeof QUESTION_TYPES)[number]
  externalId: string | null
  bodyMd: string
  modelAnswerMd: string | null
  explanationMd: string | null
  reviewNote: string
  options: {
    id: number
    bodyMd: string
    isCorrect: boolean
    explanationMd: string | null
    explanationOrigin: 'source' | 'generated' | null
  }[]
}
