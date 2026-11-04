import clsx from 'clsx'

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
}: ProgressCounts & {
  /** What this bar measures, for screen readers. */
  label: string
  showPercent?: boolean
  /** Greyed out, for tiles while Random is selected. */
  muted?: boolean
}) {
  const { correctPct, incorrectPct, percentComplete } = progressSegments({ correct, incorrect, total })

  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentComplete}
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken"
      >
        <div className={clsx('flex h-full animate-fill', muted && 'grayscale')}>
          <div
            data-segment="correct"
            className="h-full bg-correct transition-[width] duration-500 ease-out-soft"
            style={{ width: `${correctPct}%` }}
          />
          <div
            data-segment="incorrect"
            className="h-full bg-amber transition-[width] duration-500 ease-out-soft"
            style={{ width: `${incorrectPct}%` }}
          />
        </div>
      </div>
      {showPercent && (
        <span className="w-9 flex-none text-right text-xs tabular-nums text-ink-soft">{percentComplete}%</span>
      )}
    </div>
  )
}
