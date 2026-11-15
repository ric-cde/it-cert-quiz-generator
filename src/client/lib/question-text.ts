import type { AnswerState } from '@/components/AnswerOption'
import type { VerdictKind } from '@/components/Verdict'

/** The words each answered option is tagged with, as on screen plus whether it was right. */
const TAGS: Partial<Record<AnswerState, string>> = {
  'correct-chosen': 'Your answer, correct',
  'wrong-chosen': 'Your answer, wrong',
  'correct-missed': 'Missed answer, correct',
}

const VERDICTS: Partial<Record<VerdictKind, string>> = {
  correct: 'Correct',
  partial: 'Partly correct',
  incorrect: 'Incorrect',
  revealed: 'Revealed without answering',
}

export interface QuestionTextOption {
  label?: string | null
  bodyMd: string
  state: AnswerState
  explanationMd?: string | null
}

/** Indents every line after the first, so an option or explanation over several lines stays together. */
function hang(text: string, indent: string) {
  return text.trim().replace(/\n/g, `\n${indent}`)
}

/**
 * A question as plain Markdown, to paste into an LLM: the question and its options, and once it's
 * been answered or revealed, what's on screen then too: which answers were yours and which were
 * right, the verdict, and the explanations.
 */
export function questionAsText({
  bodyMd,
  multi,
  options,
  verdict,
  explanationMd,
}: {
  bodyMd: string
  multi: boolean
  options: readonly QuestionTextOption[]
  /** Given once the question is answered or revealed, when the rest shows. */
  verdict?: VerdictKind | null
  explanationMd?: string | null
}) {
  const answered = Boolean(verdict)
  const lines = [bodyMd.trim(), '', multi ? '(Choose all that apply.)' : '(Choose one.)', '']

  for (const option of options) {
    const marker = option.label ? `${option.label}.` : '-'
    const tag = answered ? TAGS[option.state] : undefined
    lines.push(`${marker} ${hang(option.bodyMd, '   ')}${tag ? ` [${tag}]` : ''}`)
    if (answered && option.explanationMd) lines.push(`   ${hang(option.explanationMd, '   ')}`)
  }

  if (answered && verdict) {
    lines.push('', `Result: ${VERDICTS[verdict] ?? verdict}`)
    if (explanationMd) lines.push('', 'Explanation:', explanationMd.trim())
  }
  return `${lines.join('\n')}\n`
}
