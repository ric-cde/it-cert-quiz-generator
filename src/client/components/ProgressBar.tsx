import clsx from 'clsx'
import { sizeStep, squareParts } from '@/lib/squares'
import type { ProgressCounts, Status } from '@shared/selection'

/**
 * Which part of the progress the status filter picks. That part is striped in white and its own
 * colour. Unsolved picks the yellow part as a whole, though a question right once and wrong since
 * is in it. All picks nothing.
 */
export type ProgressEmphasis = Status
type Segment = 'correct' | 'incorrect' | 'unanswered'

const picked: Record<ProgressEmphasis, Segment | null> = {
  all: null,
  unanswered: 'unanswered',
  incorrect: 'incorrect',
  unsolved: 'incorrect',
}

/** White stripes over the part's own colour. */
const STRIPES = 'bg-[image:repeating-linear-gradient(135deg,var(--color-surface)_0_2px,transparent_2px_4.5px)]'
const FINE_STRIPES = 'bg-[image:repeating-linear-gradient(135deg,var(--color-surface)_0_1px,transparent_1px_2.5px)]'

const COLOUR: Record<Segment, string> = {
  correct: 'bg-correct',
  incorrect: 'bg-amber',
  unanswered: 'bg-line-strong',
}

export type { ProgressCounts }

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

/** How many questions each part stands for, kept within the total. */
function progressCounts({ correct, incorrect, total }: ProgressCounts): Record<Segment, number> {
  const right = Math.min(Math.max(correct, 0), Math.max(total, 0))
  const wrong = Math.min(Math.max(incorrect, 0), Math.max(total - right, 0))
  return { correct: right, incorrect: wrong, unanswered: Math.max(total - right - wrong, 0) }
}

export type ProgressProps = ProgressCounts & {
  emphasis?: ProgressEmphasis
  /** What this measures, for screen readers. */
  label: string
  /** Greyed out, for tiles while All sources is selected. */
  muted?: boolean
}

const SEGMENT =
  'h-full transition-[width,box-shadow] duration-500 ease-out-soft first:rounded-l-full last:rounded-r-full'
/** The picked part: square-cornered to sit flush against its neighbours, with one accent outline. */
const BAR_PICKED = clsx('relative z-10 rounded-none! shadow-[0_0_0_1.5px_var(--color-accent)]', STRIPES)

/** Progress as one bar, split into green, yellow and empty. */
export function ProgressBar({
  correct,
  incorrect,
  total,
  label,
  showPercent = true,
  muted = false,
  emphasis = 'all',
}: ProgressProps & { showPercent?: boolean }) {
  const { correctPct, incorrectPct, percentComplete } = progressSegments({ correct, incorrect, total })
  const counts = progressCounts({ correct, incorrect, total })
  const standsOut = picked[emphasis]

  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentComplete}
        // Not clipped, so the picked part's outline shows around the bar.
        className="h-2 min-w-0 flex-1 rounded-full bg-sunken"
      >
        {/* Hovering any part says how many questions it stands for. */}
        {/* The fill animation clips the bar while it runs. Not keeping that clip afterwards lets the outline show. */}
        <div
          className={clsx(
            'flex h-full animate-fill items-center [animation-fill-mode:backwards]',
            muted && 'opacity-50 grayscale',
          )}
        >
          {counts.correct > 0 && (
            <div
              data-segment="correct"
              data-picked={standsOut === 'correct' || undefined}
              title={`${counts.correct} correct`}
              className={clsx(SEGMENT, 'bg-correct', standsOut === 'correct' && BAR_PICKED)}
              style={{ width: `${correctPct}%` }}
            />
          )}
          {counts.incorrect > 0 && (
            <div
              data-segment="incorrect"
              data-picked={standsOut === 'incorrect' || undefined}
              title={`${counts.incorrect} incorrect`}
              className={clsx(SEGMENT, 'bg-amber', standsOut === 'incorrect' && BAR_PICKED)}
              style={{ width: `${incorrectPct}%` }}
            />
          )}
          {counts.unanswered > 0 && (
            <div
              data-segment="unanswered"
              data-picked={standsOut === 'unanswered' || undefined}
              title={`${counts.unanswered} unanswered`}
              className={clsx(SEGMENT, 'flex-1', standsOut === 'unanswered' && clsx(BAR_PICKED, 'bg-line-strong'))}
            />
          )}
        </div>
      </div>
      {showPercent && (
        // The bar itself tells screen readers the figure, so this would only repeat it.
        <span aria-hidden="true" className="w-9 flex-none text-right text-xs text-ink-soft tabular-nums">
          {percentComplete}%
        </span>
      )}
    </div>
  )
}

/** Squares shrink in steps as a tile holds more questions, so a big source doesn't fill its tile. */
const SQUARE_STEPS = [
  { upTo: 60, size: 'lg', square: 'size-2 rounded-[1.5px]', gap: 'gap-0.5' },
  { upTo: 150, size: 'md', square: 'size-1.5 rounded-[1px]', gap: 'gap-0.5' },
  { upTo: Infinity, size: 'sm', square: 'size-1 rounded-[0.5px]', gap: 'gap-px' },
] as const

/**
 * Progress as a tiny square for each question, in the same colours as the bar: green, then yellow,
 * then grey for unanswered. The squares the status filter picks are striped, with a white outline.
 */
export function ProgressSquares({ correct, incorrect, total, label, muted = false, emphasis = 'all' }: ProgressProps) {
  const { percentComplete } = progressSegments({ correct, incorrect, total })
  const counts = progressCounts({ correct, incorrect, total })
  const standsOut = picked[emphasis]
  const squares = squareParts([
    ['correct', counts.correct],
    ['incorrect', counts.incorrect],
    ['unanswered', counts.unanswered],
  ])
  const step = sizeStep(SQUARE_STEPS, squares.length)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentComplete}
      data-size={step.size}
      // As tall as one row of the largest squares, so a tile with no questions keeps its shape.
      className={clsx('flex min-h-2 flex-wrap content-start', step.gap, muted && 'opacity-50 grayscale')}
    >
      {squares.map((part, index) => (
        <span
          key={index}
          data-segment={part}
          data-picked={standsOut === part || undefined}
          title={`${counts[part]} ${part}`}
          className={clsx(
            'flex-none',
            step.square,
            COLOUR[part],
            standsOut === part && clsx(FINE_STRIPES, 'shadow-[0_0_0_1px_var(--color-surface)]'),
          )}
        />
      ))}
    </div>
  )
}
