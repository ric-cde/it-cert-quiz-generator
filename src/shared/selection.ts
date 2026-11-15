import { z } from 'zod'

/**
 * What the take-exam screen asks for. The live count, the tile counts and quiz creation all read
 * this, through one selection function on the server, so the count can be trusted.
 */

export const STATUSES = ['all', 'unanswered', 'incorrect', 'unsolved'] as const
export type Status = (typeof STATUSES)[number]

const ids = z.array(z.number().int().positive()).max(1000).default([])

/** No tiles at all means Random: the whole exam. */
export const selectionSchema = z.strictObject({
  categoryIds: ids,
  sourceIds: ids,
  chapterIds: ids,
  status: z.enum(STATUSES).default('all'),
  /** Only the questions you've starred. */
  starred: z.boolean().default(false),
})
export type Selection = z.output<typeof selectionSchema>
export type SelectionInput = z.input<typeof selectionSchema>

export const isRandom = (selection: Pick<Selection, 'categoryIds' | 'sourceIds' | 'chapterIds'>) =>
  selection.categoryIds.length === 0 && selection.sourceIds.length === 0 && selection.chapterIds.length === 0

export type ProgressCounts = {
  /** Questions whose latest attempt was correct. */
  correct: number
  /** Questions attempted, whose latest attempt wasn't correct. */
  incorrect: number
  total: number
}
