import clsx from 'clsx'

/** Beyond this many questions, segments would be slivers, so the bar is one continuous line. */
export const MAX_SEGMENTS = 120

/**
 * How far through the quiz you are, with one segment per question: done ones filled, the current
 * one paler, the rest grey. It's in the neutral accent colour, because green and red mean marked,
 * and at-the-end feedback mustn't hint at how you're doing.
 */
export function QuizProgress({
  position,
  total,
  current,
}: {
  /** How many questions are done. */
  position: number
  total: number
  /** The question on screen, counting from 0, if it isn't done yet. */
  current?: number
}) {
  const done = Math.min(Math.max(position, 0), total)
  const bar = {
    role: 'progressbar',
    'aria-label': 'Quiz progress',
    'aria-valuemin': 0,
    'aria-valuemax': total,
    'aria-valuenow': done,
  } as const

  if (total <= 0 || total > MAX_SEGMENTS) {
    const percent = total > 0 ? (done / total) * 100 : 0
    return (
      <div {...bar} className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full bg-accent transition-[width] duration-300 ease-out-soft" style={{ width: `${percent}%` }} />
      </div>
    )
  }

  return (
    <div {...bar} className={clsx('flex h-1.5', total <= 30 ? 'gap-[3px]' : total <= 60 ? 'gap-0.5' : 'gap-px')}>
      {Array.from({ length: total }, (_, index) => {
        const state = index < done ? 'done' : index === current ? 'current' : 'todo'
        return (
          <span
            key={index}
            data-segment={state}
            className={clsx(
              'min-w-0 flex-1 rounded-[2px] transition-colors duration-300 ease-out-soft',
              state === 'done' && 'bg-accent',
              state === 'current' && 'bg-accent/35',
              state === 'todo' && 'bg-line',
            )}
          />
        )
      })}
    </div>
  )
}
