import clsx from 'clsx'
import { Star } from 'lucide-react'
import { Button } from './Button'

/**
 * A star with no word beside it: an outline when off, filled when on. On a question it stars that
 * question for you, and on the take-exam screen it narrows the quiz to the questions you've starred.
 */
export function StarButton({
  on,
  label,
  title,
  disabled = false,
  onChange,
}: {
  on: boolean
  /** What it does, for screen readers. Whether it's on is announced separately. */
  label: string
  title?: string
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      iconOnly
      aria-label={label}
      aria-pressed={on}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <Star className={clsx('size-4', on && 'fill-current text-amber-ink')} aria-hidden="true" />
    </Button>
  )
}
