import { z } from 'zod'
import type { ProgressCounts } from './selection'

/** The home page: subjects, their exams and sources with progress, and unfinished quizzes. */

export const EXAM_STATUSES = ['active', 'passed', 'abandoned'] as const
export type ExamStatus = (typeof EXAM_STATUSES)[number]
export const examStatusBody = z.strictObject({ status: z.enum(EXAM_STATUSES) })

export type HomeSource = { id: number; name: string; icon: string | null; progress: ProgressCounts }
export type HomeExam = {
  id: number
  name: string
  /** Its subject's name, which decides its icon. Passed and abandoned exams are listed outside their subject. */
  subject: string
  status: ExamStatus
  progress: ProgressCounts
  sources: HomeSource[]
}
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
export type HomeOverview = {
  subjects: HomeSubject[]
  passed: HomeExam[]
  abandoned: HomeExam[]
  unfinished: HomeQuiz[]
}
