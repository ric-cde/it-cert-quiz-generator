import clsx from 'clsx'

/**
 * Which part of a bar the status filter picks. That part stands a little taller than the rest, square-cornered
 * to sit flush against its neighbours, with a thin white outline and a second in its own colour. Unsolved picks the yellow part as a whole, though a
 * question right once and wrong since is in it. All picks nothing.
 */
export type ProgressEmphasis = 'all' | 'unanswered' | 'incorrect' | 'unsolved'
type Segment = 'correct' | 'incorrect' | 'unanswered'

const picked: Record<ProgressEmphasis, Segment | null> = {
  all: null,
  unanswered: 'unanswered',
  incorrect: 'incorrect',
  unsolved: 'incorrect',
}

const SEGMENT = 'transition-[width,height,box-shadow] duration-500 ease-out-soft first:rounded-l-full last:rounded-r-full'
const STANDS_OUT: Record<Segment, string> = {
  correct: 'relative z-10 h-3 rounded-none! shadow-[0_0_0_1px_var(--color-surface),0_0_0_2.5px_var(--color-correct)]',
  incorrect: 'relative z-10 h-3 rounded-none! shadow-[0_0_0_1px_var(--color-surface),0_0_0_2.5px_var(--color-amber)]',
  unanswered:
    'relative z-10 h-3 rounded-none! bg-line shadow-[0_0_0_1px_var(--color-surface),0_0_0_2.5px_var(--color-line-strong)]',
}

export type ProgressCounts = {
  /** Questions whose latest attempt was correct. */
  correct: number
  /** Questions attempted, whose latest attempt wasn't correct. */
  incorrect: number
  total: number
}

/**
 * Bar widths and the "% complete" figure. The figure only reads 100 when everything is correct,
 * so 199 of 200 shows 99 rather than rounding up.
 */
export function progressSegments({ correct, incorrect, total }: ProgressCounts) {
  if (total <= 0) return { correctPct: 0, incorrectPct: 0, percentComplete: 0 }
  const right = Math.min(Math.max(correct, 0), total)
  const wrong = Math.min(Math.max(incorrect, 0), total - right)
  return {
    correctPct: (right / total) * 100,
    incorrectPct: (wrong / total) * 100,
    percentComplete: Math.floor((right / total) * 100),
  }
}

export function ProgressBar({
  correct,
  incorrect,
  total,
  label,
  showPercent = true,
  muted = false,
  emphasis = 'all',
}: ProgressCounts & {
  emphasis?: ProgressEmphasis
  /** What this bar measures, for screen readers. */
  label: string
  showPercent?: boolean
  /** Greyed out, for tiles while Random is selected. */
  muted?: boolean
}) {
  const { correctPct, incorrectPct, percentComplete } = progressSegments({ correct, incorrect, total })
  const right = Math.min(Math.max(correct, 0), Math.max(total, 0))
  const wrong = Math.min(Math.max(incorrect, 0), Math.max(total - right, 0))
  const unanswered = Math.max(total - right - wrong, 0)
  const standsOut = picked[emphasis]

  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentComplete}
        // Not clipped, so the picked part can stand out above and below the bar.
        className="h-2 min-w-0 flex-1 rounded-full bg-sunken"
      >
        {/* Hovering any part says how many questions it stands for. */}
        {/* The fill animation clips the bar while it runs. Not keeping that clip afterwards lets the picked part stand out. */}
        <div className={clsx('flex h-full animate-fill items-center [animation-fill-mode:backwards]', muted && 'opacity-50 grayscale')}>
          {right > 0 && (
            <div
              data-segment="correct"
              data-picked={standsOut === 'correct' || undefined}
              title={`${right} correct`}
              className={clsx(SEGMENT, 'bg-correct', standsOut === 'correct' ? STANDS_OUT.correct : 'h-full')}
              style={{ width: `${correctPct}%` }}
            />
          )}
          {wrong > 0 && (
            <div
              data-segment="incorrect"
              data-picked={standsOut === 'incorrect' || undefined}
              title={`${wrong} incorrect`}
              className={clsx(SEGMENT, 'bg-amber', standsOut === 'incorrect' ? STANDS_OUT.incorrect : 'h-full')}
              style={{ width: `${incorrectPct}%` }}
            />
          )}
          {unanswered > 0 && (
            <div
              data-segment="unanswered"
              data-picked={standsOut === 'unanswered' || undefined}
              title={`${unanswered} unanswered`}
              className={clsx(SEGMENT, 'flex-1', standsOut === 'unanswered' ? STANDS_OUT.unanswered : 'h-full')}
            />
          )}
        </div>
      </div>
      {showPercent && (
        // The bar itself tells screen readers the figure, so this would only repeat it.
        <span aria-hidden="true" className="w-9 flex-none text-right text-xs tabular-nums text-ink-soft">
          {percentComplete}%
        </span>
      )}
    </div>
  )
}
