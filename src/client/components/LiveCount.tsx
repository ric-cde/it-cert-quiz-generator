import clsx from 'clsx'
import { sizeStep, squareParts } from '@/lib/squares'
import type { QuizMix } from '@shared/practice'
import { Button } from './Button'
import { Kbd } from './Kbd'
import { Spinner } from './Spinner'
import { cardClass } from './Card'

type StripPart = keyof QuizMix | 'selected'
const STRIP_COLOUR: Record<StripPart, string> = {
  correct: 'bg-correct',
  incorrect: 'bg-amber',
  unanswered: 'bg-line-strong',
  selected: 'bg-accent',
}

/** One size up to 50 questions, then smaller in steps, so a long quiz stays a few lines deep. */
const STRIP_STEPS = [
  { upTo: 50, size: 'xl', square: 'size-3.5 rounded-[2px]', gap: 'gap-[3px]' },
  { upTo: 100, size: 'lg', square: 'size-2.5 rounded-[2px]', gap: 'gap-[3px]' },
  { upTo: 200, size: 'md', square: 'size-2 rounded-[1.5px]', gap: 'gap-0.5' },
  { upTo: 350, size: 'sm', square: 'size-1.5 rounded-[1px]', gap: 'gap-0.5' },
  { upTo: Infinity, size: 'xs', square: 'size-1 rounded-[0.5px]', gap: 'gap-0.5' },
] as const

/**
 * One square for each question the quiz will ask, wrapping onto more lines as needed. They are
 * always square, and never stretch. Given the mix, they're coloured as the progress bars are,
 * green then yellow then grey. Otherwise they're all accent.
 */
export function SelectionStrip({ count, mix }: { count: number; mix?: QuizMix }) {
  const parts = squareParts<StripPart>(
    mix
      ? [
          ['correct', mix.correct],
          ['incorrect', mix.incorrect],
          ['unanswered', mix.unanswered],
        ]
      : [['selected', count]],
  )
  const step = sizeStep(STRIP_STEPS, parts.length)
  return (
    <div aria-hidden="true" data-size={step.size} className={clsx('flex flex-wrap content-center', step.gap)}>
      {parts.map((part, index) => (
        <span key={index} data-question={part} className={clsx('flex-none', step.square, STRIP_COLOUR[part])} />
      ))}
    </div>
  )
}

/** The "20 of 137 available" readout, with the action that starts the quiz. */
export function LiveCount({
  selected,
  available,
  loading = false,
  onStart,
  bar = false,
  shortcut,
  mix,
  strip = true,
}: {
  selected: number
  available: number
  loading?: boolean
  onStart?: () => void
  /**
   * Square-edged and tinted, for the bar along the bottom of the take-exam screen, with a square
   * for each question chosen. The parent stretches it to the full width of the window.
   */
  bar?: boolean
  /** The key that starts the quiz, shown on the button. */
  shortcut?: string
  /** How the questions split by status, to colour the strip. */
  mix?: QuizMix
  /** The strip of questions in the bar. Settings can turn it off. */
  strip?: boolean
}) {
  const none = available === 0
  return (
    <div
      className={
        bar
          ? 'border-t border-accent/30 bg-accent-soft shadow-bar'
          : cardClass({ padding: 'none', elevation: 'raised' })
      }
    >
      <div
        className={
          bar
            ? 'mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-4 py-3'
            : 'flex flex-wrap items-center justify-between gap-3 px-4 py-3'
        }
      >
        <p aria-live="polite" aria-busy={loading} className="flex items-baseline gap-2 text-lg text-ink-soft">
          {none ? (
            <span className="font-semibold">No questions match</span>
          ) : (
            <>
              <span className="text-4xl leading-none font-extrabold tracking-tight text-accent-strong tabular-nums">
                {selected}
              </span>
              <span className="font-medium tabular-nums">of {available} available</span>
              {loading && <Spinner className="size-3.5 self-center" />}
            </>
          )}
        </p>
        {bar && strip && !none && (
          <div className="order-last basis-full sm:order-none sm:min-w-0 sm:flex-1 sm:basis-0">
            <SelectionStrip count={selected} mix={mix} />
          </div>
        )}
        <Button variant="primary" disabled={none || loading} onClick={onStart} className={clsx(bar && 'sm:px-8')}>
          Start quiz {shortcut && !none && <Kbd tone="on-accent">{shortcut}</Kbd>}
        </Button>
      </div>
    </div>
  )
}
