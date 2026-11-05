import type { SourceTrust } from './domain'
import type { QuestionBank } from './question-bank'
import type { BankIssue } from './question-bank-checks'

/** What loading a question bank would do, or did. Shared by the server and the import screen. */

export type BankQuestion = QuestionBank['chapters'][number]['questions'][number]

/** `deleted` means it was deleted in the app, so it stays deleted rather than coming back. */
export type ImportAction = 'new' | 'updated' | 'unchanged' | 'deleted'

export type PlannedQuestion = {
  question: BankQuestion
  action: ImportAction
  /** What an update would change, in words. */
  changes: string[]
  /** Set when this new question is already in the exam, or earlier in the file. */
  duplicateOf?: { place: string; answersDiffer: boolean }
  warnings: string[]
}

/** A category or topic the exam already has, as offered when choosing where a name goes. */
export type ExamCategory = { id: number; name: string; parent: string | null; official: boolean }

/**
 * How a category name in the file matches the exam:
 * - `official` / `topic`: one of the exam's own categories or topics
 * - `unofficial`: a category added on an earlier import
 * - `remembered`: a name mapped to a category on an earlier import
 * - `new`: not seen before, so the user chooses where it goes
 */
export type CategoryStatus = 'official' | 'topic' | 'unofficial' | 'remembered' | 'new'

export type PlannedCategory = {
  name: string
  count: number
  status: CategoryStatus
  /** Where its questions go, for any status but `new`. */
  target?: ExamCategory
  /** For a new name: an existing category or topic with the same name apart from case and spacing. */
  suggestion?: ExamCategory
}

/** Put a name's questions in an existing category or topic, or keep the name as a new unofficial category. */
export type CategoryChoice = { map: number } | { keep: true }

/** The users can change where a new or remembered name goes. The others are fixed. */
export const isChoosable = (category: PlannedCategory) => category.status === 'new' || category.status === 'remembered'

/** What happens to a name if the user doesn't choose: the earlier choice, a near match, or a new category. */
export function defaultChoice(category: PlannedCategory): CategoryChoice {
  const target = category.target ?? category.suggestion
  return target ? { map: target.id } : { keep: true }
}

export type ImportCounts = Record<ImportAction, number> & { duplicates: number; toReview: number; total: number }

export type ImportPlan = {
  ok: true
  exam: string
  source: {
    name: string
    origin: QuestionBank['source']['origin']
    trust: SourceTrust | null
    reference: string | null
    exists: boolean
  }
  /** Every category name the file uses, in order of first use. */
  categories: PlannedCategory[]
  /** Where a name can be mapped to: the exam's categories and topics, official ones first. */
  examCategories: ExamCategory[]
  chapters: { name: string; questions: PlannedQuestion[] }[]
  counts: ImportCounts
  omitted: NonNullable<QuestionBank['omitted']>
  warnings: BankIssue[]
  /** Questions already in this source that the file doesn't mention. They're left alone. */
  notInFile: number
}

export type ImportRejected = { ok: false; problems: BankIssue[] }
export type ImportPreview = ImportPlan | ImportRejected

export type ImportOptions = {
  /** Duplicates are skipped unless this is set. */
  includeDuplicates?: boolean
  /** Import only the first few questions in the file, as a trial. */
  limit?: number
  /** Where new or remembered category names go. Any left out take their `defaultChoice`. */
  categoryChoices?: Record<string, CategoryChoice>
}

export type ImportResult = {
  ok: true
  sourceId: number
  added: number
  updated: number
  unchanged: number
  skippedDuplicates: number
  skippedDeleted: number
  notImportedByLimit: number
  /** Questions in this source with a doubt still to look at. */
  toReview: number
}

export const SAMPLE_IMPORT_SIZE = 10

export type SourceSummary = {
  id: number
  exam: string
  name: string
  origin: string
  trust: SourceTrust | null
  reference: string | null
  chapters: number
  questions: number
  flagged: number
  toReview: number
  attempts: number
}
