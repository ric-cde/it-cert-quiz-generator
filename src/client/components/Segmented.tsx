import clsx from 'clsx'
import { RadioGroup } from 'radix-ui'
import { useId } from 'react'
import { plural } from '@/lib/quiz-words'

/** Pick one of a few options. Arrow keys move between them. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className,
}: {
  label: string
  value: T
  /** `count` puts a small count in the option's top-right corner, read out as its description. */
  options: readonly { value: T; label: string; count?: number }[]
  onChange?: (value: T) => void
  disabled?: boolean
  /** Extra layout, such as a grid on a phone for options that won't fit on one line. */
  className?: string
}) {
  const id = useId()
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange?.(next as T)}
      className={clsx('inline-flex max-w-full flex-wrap gap-0.5 rounded-md bg-sunken p-0.5', className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          // The count is its description, not part of its name.
          aria-label={option.count === undefined ? undefined : option.label}
          aria-describedby={option.count === undefined ? undefined : `${id}-${option.value}`}
          className={clsx(
            'group min-h-8 cursor-pointer rounded-sm px-3 text-sm font-medium transition-colors duration-100',
            'data-[state=checked]:bg-surface data-[state=checked]:font-semibold data-[state=checked]:text-accent-strong data-[state=checked]:shadow-raised',
            'data-[state=unchecked]:text-ink-soft data-[state=unchecked]:hover:text-ink',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {option.label}
          {option.count !== undefined && <CountBubble id={`${id}-${option.value}`} count={option.count} />}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}

/** A small count, raised to the top right of the word before it. Accent when its option is picked. */
function CountBubble({ id, count }: { id: string; count: number }) {
  return (
    <span
      id={id}
      className={clsx(
        'ml-1 inline-flex h-4 min-w-4 -translate-y-1.5 items-center justify-center rounded-full px-1 align-middle text-[0.625rem] leading-none font-semibold tabular-nums',
        'bg-line text-ink-soft group-data-[state=checked]:bg-accent group-data-[state=checked]:text-on-accent',
      )}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{plural(count, 'question')}</span>
    </span>
  )
}
