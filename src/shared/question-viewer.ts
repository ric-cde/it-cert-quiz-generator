/**
 * The question viewer at /dev/questions: one source's questions with your history on each, as JSON
 * to copy into another LLM, so it can write new questions aimed at what you found hard.
 *
 * Questions are laid out as in the question bank format, so they read the same as the files the
 * skill writes. `history` is extra, so this isn't a file to import.
 */

export type ViewerHistory = {
  /** Judged attempts, including reveals. */
  attempts: number
  /** How many of those were right. */
  correct: number
  starred: boolean
}

export type ViewerOption = { label?: string; bodyMd: string; isCorrect: boolean; explanationMd?: string }

export type ViewerQuestion = {
  externalId?: string
  category: string
  type: 'single' | 'multi' | 'free_form'
  bodyMd: string
  options?: ViewerOption[]
  explanationMd?: string
  modelAnswerMd?: string
  history: ViewerHistory
}

export type ViewerData = {
  exam: string
  source: string
  chapters: { name: string; questions: ViewerQuestion[] }[]
}

export const VIEWER_FILTERS = ['starred', 'incorrect', 'correct', 'unsolved'] as const
export type ViewerFilter = (typeof VIEWER_FILTERS)[number]

export const VIEWER_FILTER_LABELS: Record<ViewerFilter, { label: string; hint: string }> = {
  starred: { label: 'Starred', hint: "You've starred it" },
  incorrect: { label: 'Incorrect', hint: 'Ever answered wrongly, even if right since' },
  correct: { label: 'Correct', hint: 'Right first time, and never wrong' },
  unsolved: { label: 'Unsolved', hint: 'Never right, including never tried' },
}

/**
 * - Starred: you've starred it
 * - Incorrect: ever answered wrongly or revealed, even if the latest attempt was right
 * - Correct: right the first time and every time since
 * - Unsolved: never right, including never attempted, as on the take-exam screen
 */
export function matchesViewerFilter({ attempts, correct, starred }: ViewerHistory, filter: ViewerFilter) {
  switch (filter) {
    case 'starred':
      return starred
    case 'incorrect':
      return attempts > correct
    case 'correct':
      return attempts > 0 && attempts === correct
    case 'unsolved':
      return correct === 0
  }
}

/**
 * The questions that match any of the filters, or all of them with no filter on. Chapters left
 * with nothing are dropped.
 */
export function filterViewer(data: ViewerData, filters: readonly ViewerFilter[]): ViewerData {
  if (filters.length === 0) return data
  return {
    ...data,
    chapters: data.chapters
      .map((chapter) => ({
        ...chapter,
        questions: chapter.questions.filter((question) =>
          filters.some((filter) => matchesViewerFilter(question.history, filter)),
        ),
      }))
      .filter((chapter) => chapter.questions.length > 0),
  }
}

export const countViewerQuestions = (data: ViewerData) =>
  data.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0)
