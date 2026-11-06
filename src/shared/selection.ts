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
})
export type Selection = z.output<typeof selectionSchema>
export type SelectionInput = z.input<typeof selectionSchema>

export const isRandom = (selection: Pick<Selection, 'categoryIds' | 'sourceIds' | 'chapterIds'>) =>
  selection.categoryIds.length === 0 && selection.sourceIds.length === 0 && selection.chapterIds.length === 0

export type ProgressCounts = { correct: number; incorrect: number; total: number }

export const EXAM_STATUSES = ['active', 'passed', 'abandoned'] as const
export type ExamStatus = (typeof EXAM_STATUSES)[number]
export const examStatusBody = z.strictObject({ status: z.enum(EXAM_STATUSES) })

export type HomeSource = { id: number; name: string; progress: ProgressCounts }
export type HomeExam = { id: number; name: string; status: ExamStatus; progress: ProgressCounts; sources: HomeSource[] }
export type HomeSubject = { id: number; name: string; exams: HomeExam[] }
export type HomeQuiz = {
  id: number
  exam: string
  label: string
  feedback: 'after_each' | 'at_end'
  position: number
  total: number
  /** ISO 8601. */
  startedAt: string
}
/**
 * Subjects list only the exams still being studied. Passed and abandoned exams move to their own
 * lists at the bottom, in the same order.
 */
export type HomeOverview = { subjects: HomeSubject[]; passed: HomeExam[]; abandoned: HomeExam[]; unfinished: HomeQuiz[] }
