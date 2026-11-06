import { z } from 'zod'
import { FEEDBACK_MODES, QUIZ_SORTS } from '../../shared/domain'

/**
 * Choices remembered in this browser only, never on the server. For now every preference like
 * this lives here, including those in the future settings pane. Storage can be missing or full,
 * as in a private window, and then the choices simply aren't remembered.
 */

const choicesSchema = z.object({
  max: z.union([z.number().int().positive(), z.literal('max')]).optional(),
  feedback: z.enum(FEEDBACK_MODES).optional(),
  sort: z.enum(QUIZ_SORTS).optional(),
})
export type TakeExamChoices = z.infer<typeof choicesSchema>

const key = (examId: string) => `take-exam:${examId}`

/** The last Max questions, Feedback and Sort chosen for an exam. */
export function readChoices(examId: string): TakeExamChoices {
  try {
    const parsed = choicesSchema.safeParse(JSON.parse(localStorage.getItem(key(examId)) ?? '{}'))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function saveChoices(examId: string, choices: TakeExamChoices) {
  try {
    localStorage.setItem(key(examId), JSON.stringify(choices))
  } catch {
    // Not remembered this time, which is harmless.
  }
}
