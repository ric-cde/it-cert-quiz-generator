import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useId } from 'react'

/** The chevron on anything that opens and closes. It turns over while open. `className` replaces its size. */
export function ExpandChevron({ open, className = 'size-4' }: { open: boolean; className?: string }) {
  return (
    <ChevronDown
      className={clsx('flex-none transition-transform duration-150', open && 'rotate-180', className)}
      aria-hidden="true"
    />
  )
}

const TONE = {
  /** A grey bar, for something tucked away at the bottom of a screen. */
  quiet: 'rounded-md bg-sunken px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink',
  /** A card-like bar, for a section that's part of the screen. */
  card: 'rounded-md border border-line bg-surface px-4 py-3 shadow-card hover:border-accent',
} as const

/**
 * A full-width bar that shows or hides what's below it. The parent keeps whether it's open, so it
 * can, say, fetch the contents only once they're shown.
 */
export function Disclosure({
  summary,
  open,
  onToggle,
  tone = 'quiet',
  heading,
  contentClassName,
  children,
}: {
  /** The bar's text, which is also the button's name. */
  summary: ReactNode
  open: boolean
  onToggle: () => void
  tone?: keyof typeof TONE
  /** Wraps the bar in a heading, such as `{ level: 'h2', id }`, so it can name a section. */
  heading?: { level: 'h2' | 'h3'; id?: string }
  contentClassName?: string
  children: ReactNode
}) {
  const panelId = useId()
  const button = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
      className={clsx('flex w-full cursor-pointer items-center justify-between gap-2 text-left', TONE[tone])}
    >
      {summary}
      <ExpandChevron open={open} />
    </button>
  )
  const Heading = heading?.level

  return (
    <>
      {Heading ? (
        <Heading id={heading.id} className="text-base">
          {button}
        </Heading>
      ) : (
        button
      )}
      {open && (
        <div id={panelId} className={clsx('mt-3 animate-rise', contentClassName)}>
          {children}
        </div>
      )}
    </>
  )
}
