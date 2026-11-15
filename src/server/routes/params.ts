import { z } from 'zod'

/** A positive whole number in the path or query, such as the 12 in /api/quizzes/12. */
export const positiveId = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)

export const idParam = z.object({ id: positiveId })

/** How a quiz action that failed is sent back. */
export const QUIZ_FAILURE_STATUS = { 'not-found': 404, conflict: 409, invalid: 400 } as const
