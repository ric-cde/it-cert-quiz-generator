import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Kbd } from './Kbd'
import { CrossMark, TickMark } from './Marks'

/**
 * - `idle` / `selected`: still answering
 * - `correct-chosen`: you picked it and it's right
 * - `correct-missed`: it's right but you didn't pick it (also used after a reveal)
 * - `wrong-chosen`: you picked it and it's wrong
 * - `neutral`: locked, not picked and not right
 */
export type AnswerState = 'idle' | 'selected' | 'correct-chosen' | 'correct-missed' | 'wrong-chosen' | 'neutral'

/** Works out how an option should look from what happened to it. */
export function answerState({
  chosen,
  isCorrect,
  locked,
}: {
  chosen: boolean
  isCorrect: boolean
  locked: boolean
}): AnswerState {
  if (!locked) return chosen ? 'selected' : 'idle'
  if (isCorrect) return chosen ? 'correct-chosen' : 'correct-missed'
  return chosen ? 'wrong-chosen' : 'neutral'
}

const containerByState: Record<AnswerState, string> = {
  idle: 'border-line-strong/70 bg-surface cursor-pointer hocus:border-accent hocus:bg-accent-soft/40',
  selected: 'border-accent bg-accent-soft cursor-pointer',
  // A picked correct answer is solid and filled. A missed one has wide dashes and green stripes,
  // sized by percentage so there are about six across, whatever the option's width.
  'correct-chosen': 'border-correct bg-correct-soft shadow-[inset_0_0_0_1px_var(--color-correct)]',
  'correct-missed':
    'relative border-transparent bg-surface bg-[image:repeating-linear-gradient(135deg,var(--color-correct-soft)_0_7%,transparent_7%_14%)]',
  'wrong-chosen': 'border-wrong bg-wrong-soft animate-nudge',
  neutral: 'border-line bg-surface',
}

/** The mark and colour show this on screen. These words are for screen readers. */
const meaningByState: Partial<Record<AnswerState, string>> = {
  'correct-chosen': 'Marked correct',
  'wrong-chosen': 'Marked incorrect',
}

/** The tag in an option's top right corner, once locked. */
const tagByState: Partial<Record<AnswerState, { text: string; className: string }>> = {
  'correct-chosen': { text: 'Your answer', className: 'border-correct text-correct-ink' },
  'wrong-chosen': { text: 'Your answer', className: 'border-wrong text-wrong-ink' },
  'correct-missed': { text: 'Correct answer', className: 'border-dashed border-correct text-correct-ink' },
}

/**
 * The border of a correct answer you didn't pick. CSS dashes are short and close together, which
 * looks too like a solid line, so this draws its own with wider gaps.
 */
function WideDashedBorder() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute -top-[0.75px] -left-[0.75px] size-[calc(100%+1.5px)] overflow-visible text-correct">
      <rect
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeDasharray="7 6"
        style={{ rx: 'calc(var(--radius-md) - 0.75px)', ry: 'calc(var(--radius-md) - 0.75px)' }}
      />
    </svg>
  )
}

function Marker({ state, kind }: { state: AnswerState; kind: 'single' | 'multi' }) {
  if (state === 'correct-chosen' || state === 'correct-missed') return <TickMark className="text-correct" />
  if (state === 'wrong-chosen') return <CrossMark className="text-wrong" />

  const shape = kind === 'single' ? 'rounded-full' : 'rounded-sm'
  if (state === 'selected') {
    return (
      <span className={clsx('flex size-5.5 items-center justify-center bg-accent', shape)}>
        {kind === 'single' ? (
          <span className="size-2 animate-pop rounded-full bg-on-accent" />
        ) : (
          <Check className="size-4 animate-pop text-on-accent" strokeWidth={3.5} aria-hidden="true" />
        )}
      </span>
    )
  }
  return (
    <span
      className={clsx(
        'block size-5.5 border-[1.5px] bg-surface',
        shape,
        state === 'neutral' ? 'border-line' : 'border-line-strong',
      )}
    />
  )
}

export function AnswerOption({
  kind,
  name,
  state,
  children,
  explanation,
  shortcut,
  disabled = false,
  onToggle,
  'data-force': force,
}: {
  kind: 'single' | 'multi'
  /** Shared by the options of a question, so radios group together. */
  name: string
  state: AnswerState
  /** The option text, usually from Markdown. */
  children: ReactNode
  /** Per-answer text. Nothing is shown when it's missing. */
  explanation?: ReactNode
  /** The number key that selects this option. Hidden once locked. */
  shortcut?: number
  /** Temporarily can't be changed, for example while saving. */
  disabled?: boolean
  onToggle?: () => void
  'data-force'?: string
}) {
  const interactive = state === 'idle' || state === 'selected'
  const inactive = !interactive || disabled
  const meaning = meaningByState[state]
  const tag = tagByState[state]

  return (
    <label
      data-state={state}
      data-force={force}
      className={clsx(
        'block rounded-md border-[1.5px] px-3.5 py-3 transition-colors duration-100',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
        'focus-ring:outline-2 focus-ring:outline-offset-2 focus-ring:outline-accent',
        containerByState[state],
        disabled && interactive && 'cursor-not-allowed opacity-60',
      )}
    >
      {state === 'correct-missed' && <WideDashedBorder />}
      <input
        type={kind === 'single' ? 'radio' : 'checkbox'}
        name={name}
        checked={state === 'selected' || state === 'correct-chosen' || state === 'wrong-chosen'}
        disabled={inactive}
        onChange={() => onToggle?.()}
        className="sr-only"
      />
      <span className="flex items-start gap-3">
        <span className="flex size-6 flex-none items-center justify-center">
          <Marker state={state} kind={kind} />
        </span>
        <span className={clsx('min-w-0 flex-1', state === 'neutral' && 'text-ink-soft')}>
          {children}
          {meaning && <span className="sr-only">{meaning}</span>}
          {explanation && (
            <span className="mt-1.5 block animate-rise text-sm text-ink-soft">{explanation}</span>
          )}
        </span>
        {shortcut !== undefined && interactive && (
          <span className="hidden flex-none sm:block">
            <Kbd>{shortcut}</Kbd>
          </span>
        )}
        {tag && (
          <span
            className={clsx(
              'flex-none rounded-full border bg-surface px-2 py-px text-xs font-bold whitespace-nowrap',
              tag.className,
            )}
          >
            {tag.text}
          </span>
        )}
      </span>
    </label>
  )
}
