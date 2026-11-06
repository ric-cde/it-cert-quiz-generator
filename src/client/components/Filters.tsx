import clsx from 'clsx'
import { RadioGroup, Switch as RadixSwitch } from 'radix-ui'
import type { ReactNode, Ref } from 'react'
import { useId } from 'react'
import { Button } from './Button'
import { Kbd } from './Kbd'
import { inputClass } from './Field'
import { Spinner } from './Spinner'

/** Holds the filters, fitting as many on a line as the width allows. */
export function FilterPanel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap gap-x-6 gap-y-4">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  )
}

/** One filter, with its label above it, and the key that changes it if there is one. */
export function FilterField({ label, shortcut, children }: { label: string; shortcut?: string; children: ReactNode }) {
  return (
    <div className="max-w-full min-w-0">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
        {label} {shortcut && <Kbd>{shortcut}</Kbd>}
      </p>
      {children}
    </div>
  )
}

/** Pick one of a few options. Arrow keys move between them. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange?: (value: T) => void
  disabled?: boolean
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange?.(next as T)}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-md bg-sunken p-0.5"
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={clsx(
            'min-h-8 cursor-pointer rounded-sm px-3 text-sm font-medium transition-colors duration-100',
            'data-[state=checked]:bg-surface data-[state=checked]:font-semibold data-[state=checked]:text-accent-strong data-[state=checked]:shadow-raised',
            'data-[state=unchecked]:text-ink-soft data-[state=unchecked]:hover:text-ink',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}

export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <RadixSwitch.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="relative mt-0.5 h-6 w-10 flex-none cursor-pointer rounded-full bg-line-strong transition-colors duration-150 data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-surface shadow-raised transition-transform duration-200 ease-spring data-[state=checked]:translate-x-[1.125rem]" />
      </RadixSwitch.Root>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </label>
    </div>
  )
}

export type MaxQuestions = number | 'max'

export const PRESETS = [20, 50, 100] as const

/** What M moves to next: through the presets and Max, then the number field, shown as null. */
export function nextMaxQuestions(value: MaxQuestions): MaxQuestions | null {
  if (value === 'max') return null
  const index = (PRESETS as readonly number[]).indexOf(value)
  if (index === -1) return PRESETS[0]
  return PRESETS[index + 1] ?? 'max'
}

/** Reads the number field. Anything that isn't a whole number above zero means "no value yet". */
export function parseMaxQuestions(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const value = Number(text)
  return value > 0 ? value : null
}

/** Question cap: presets, Max, and a number field for any other value. */
export function MaxQuestionsPicker({
  value,
  onChange,
  inputRef,
}: {
  value: MaxQuestions
  onChange?: (value: MaxQuestions) => void
  /** For the shortcut that moves on from Max to the number field. */
  inputRef?: Ref<HTMLInputElement>
}) {
  const isPreset = value === 'max' || (PRESETS as readonly number[]).includes(value)

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Max questions">
      <Segmented
        label="Max questions preset"
        value={isPreset ? String(value) : ''}
        options={[...PRESETS.map((n) => ({ value: String(n), label: String(n) })), { value: 'max', label: 'Max' }]}
        onChange={(next) => onChange?.(next === 'max' ? 'max' : Number(next))}
      />
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        ref={inputRef}
        aria-label="Custom number of questions"
        value={isPreset ? '' : value}
        onChange={(event) => {
          const parsed = parseMaxQuestions(event.target.value)
          if (parsed !== null) onChange?.(parsed)
        }}
        // Three digits is plenty. Left blank: a placeholder standing in for a label is a known
        // usability problem, and the field's label is there for screen readers.
        className={clsx(inputClass(), 'w-[4.25rem]')}
      />
    </div>
  )
}

/** Beyond this many, the strip would be a wall, so it stops adding rectangles. */
export const MAX_STRIP = 500

/**
 * One rectangle for each question the quiz will ask. Few questions stretch to fill the width, and
 * many keep a minimum width and wrap onto more lines.
 */
export function SelectionStrip({ count }: { count: number }) {
  const shown = Math.min(Math.max(count, 0), MAX_STRIP)
  return (
    <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fit,minmax(6px,1fr))] gap-[3px]">
      {Array.from({ length: shown }, (_, index) => (
        <span key={index} data-question className="h-2 rounded-[2px] bg-accent" />
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
}: {
  selected: number
  available: number
  loading?: boolean
  onStart?: () => void
  /**
   * Square-edged and tinted, for the bar along the bottom of the take-exam screen, with a strip of
   * the questions chosen. The parent stretches it to the full width of the window.
   */
  bar?: boolean
  /** The key that starts the quiz, shown on the button. */
  shortcut?: string
}) {
  const none = available === 0
  return (
    <div
      className={
        bar
          ? 'border-t border-accent/30 bg-accent-soft shadow-[0_-4px_16px_-8px_oklch(0.25_0.025_265/0.25)]'
          : 'rounded-lg border border-line bg-surface shadow-raised'
      }
    >
      <div
        className={
          bar
            ? 'mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-4 py-3'
            : 'flex flex-wrap items-center justify-between gap-3 px-4 py-3'
        }
      >
      <p aria-live="polite" aria-busy={loading} className="flex items-baseline gap-1.5 text-ink-soft">
        {none ? (
          <span className="font-semibold">No questions match</span>
        ) : (
          <>
            <span className="text-xl font-bold tabular-nums text-ink">{selected}</span>
            <span className="tabular-nums">of {available} available</span>
            {loading && <Spinner className="size-3.5 self-center" />}
          </>
        )}
      </p>
      {bar && !none && (
        <div className="order-last basis-full sm:order-none sm:min-w-0 sm:flex-1 sm:basis-0">
          <SelectionStrip count={selected} />
        </div>
      )}
      <Button variant="primary" disabled={none || loading} onClick={onStart} className={clsx(bar && 'sm:px-8')}>
        Start quiz {shortcut && !none && <Kbd tone="on-accent">{shortcut}</Kbd>}
      </Button>
      </div>
    </div>
  )
}
