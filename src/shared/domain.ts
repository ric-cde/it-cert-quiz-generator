/** The fixed values and JSON shapes in the data model, shared by the server and client. */

export const ROLES = ['admin', 'editor', 'learner'] as const
export type Role = (typeof ROLES)[number]

export const SOURCE_ORIGINS = ['upload', 'import', 'generated'] as const
/** How far a source can be trusted, separate from its 1-5 rating. */
export const SOURCE_TRUST = ['official', 'third_party', 'ai'] as const
export type SourceTrust = (typeof SOURCE_TRUST)[number]
export const QUESTION_TYPES = ['single', 'multi', 'free_form'] as const
export const EXPLANATION_ORIGINS = ['source', 'generated'] as const
export const QUIZ_MODES = ['study', 'mock'] as const
export const FEEDBACK_MODES = ['after_each', 'at_end'] as const
export type Feedback = (typeof FEEDBACK_MODES)[number]
export const ATTEMPT_RESULTS = ['correct', 'partial', 'incorrect', 'pending'] as const
export const ATTEMPT_KINDS = ['answered', 'revealed'] as const
export const DRAFT_KINDS = ['import', 'generate'] as const
export const DRAFT_STATUSES = ['processing', 'ready', 'approved', 'discarded', 'failed'] as const
export const AI_PURPOSES = ['judging', 'generation', 'extraction', 'explanation'] as const

export type ExplanationSource = { title: string; url: string }

export type PriorityWeights = {
  difficulty: number
  failureRate: number
  streak: number
  timeSinceSeen: number
  sourceRating: number
}

/** How a quiz was set up. Stage 6 adds the take-exam options. */
export type QuizConfig = {
  feedback: Feedback
  sourceId: number
}

export type QuizDefaults = {
  feedback: Feedback
  maxQuestions: number | 'max'
  prioritise: boolean
  sort: 'random' | 'easiest' | 'hardest'
}

/** Equal weights are a placeholder until Stage 7 tunes them. */
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  difficulty: 1,
  failureRate: 1,
  streak: 1,
  timeSinceSeen: 1,
  sourceRating: 1,
}

export const DEFAULT_QUIZ_DEFAULTS: QuizDefaults = {
  feedback: 'after_each',
  maxQuestions: 20,
  prioritise: false,
  sort: 'random',
}
