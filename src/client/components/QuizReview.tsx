import type { CategoryResult, ReviewEntry } from '../../shared/quiz'
import { AnswerOption, answerState } from './AnswerOption'
import { Markdown } from './Markdown'
import { ProgressBar } from './ProgressBar'
import { NoExplanation, QuestionExplanation } from './QuestionExplanation'
import { ReviewNotice } from './ReviewNotice'
import { Verdict } from './Verdict'

/** How each category went in a quiz, weakest first. */
export function CategoryBreakdown({ categories }: { categories: CategoryResult[] }) {
  if (categories.length === 0) return null
  return (
    <section aria-labelledby="by-category-heading">
      <h2 id="by-category-heading" className="mb-2 text-base">
        By category
      </h2>
      <ul className="space-y-2.5">
        {categories.map((category) => (
          <li key={category.name} className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center">
            <span className="flex min-w-0 items-baseline justify-between gap-2 text-sm">
              <span className="break-words">{category.name}</span>
              <span className="flex-none text-xs tabular-nums text-ink-soft">
                {category.correct} of {category.asked}
              </span>
            </span>
            <ProgressBar
              correct={category.correct}
              incorrect={category.asked - category.correct}
              total={category.asked}
              showPercent={false}
              label={`${category.name}: ${category.correct} of ${category.asked} correct`}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** One question in Review answers: what you chose, the right answer, and all the text there is. */
export function ReviewEntryCard({ entry }: { entry: ReviewEntry }) {
  const multi = entry.type === 'multi'
  const missed = entry.outcome !== 'correct'
  const hasText = Boolean(entry.explanationMd) || entry.options.some((option) => option.explanationMd)

  return (
    <article
      aria-label={`Question ${entry.number}`}
      data-revealed={entry.outcome === 'revealed' ? '' : undefined}
      className="rounded-lg border border-line bg-surface p-4 shadow-card data-revealed:bg-sunken sm:p-5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs break-words text-ink-soft">
          Question {entry.number} · {entry.source}
          {entry.category && ` · ${entry.category}`}
        </p>
        <Verdict kind={entry.outcome} />
      </div>

      {entry.reviewNote && (
        <div className="mb-3">
          <ReviewNotice note={entry.reviewNote} answered />
        </div>
      )}

      <Markdown>{entry.bodyMd}</Markdown>

      <div className="mt-4 space-y-2">
        {entry.options.map((option) => (
          <AnswerOption
            key={option.id}
            kind={multi ? 'multi' : 'single'}
            name={`review-${entry.number}`}
            state={answerState({ chosen: option.chosen, isCorrect: option.isCorrect, locked: true })}
            explanation={option.explanationMd ? <Markdown>{option.explanationMd}</Markdown> : undefined}
          >
            <Markdown>{option.bodyMd}</Markdown>
          </AnswerOption>
        ))}
      </div>

      {entry.explanationMd && <QuestionExplanation markdown={entry.explanationMd} />}
      {missed && !hasText && <NoExplanation />}
    </article>
  )
}
