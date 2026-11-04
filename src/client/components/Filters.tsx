import clsx from 'clsx'
import { RadioGroup, Switch as RadixSwitch } from 'radix-ui'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { Button } from './Button'
import { inputClass } from './Field'
import { Spinner } from './Spinner'

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

const PRESETS = [20, 50, 100] as const

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
}: {
  value: MaxQuestions
  onChange?: (value: MaxQuestions) => void
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
        aria-label="Custom number of questions"
        placeholder="Other"
        value={isPreset ? '' : value}
        onChange={(event) => {
          const parsed = parseMaxQuestions(event.target.value)
          if (parsed !== null) onChange?.(parsed)
        }}
        className={clsx(inputClass(), 'w-24')}
      />
    </div>
  )
}

/** The "20 of 137 available" readout, with the action that starts the quiz. */
export function LiveCount({
  selected,
  available,
  loading = false,
  onStart,
}: {
  selected: number
  available: number
  loading?: boolean
  onStart?: () => void
}) {
  const none = available === 0
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-raised">
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
      <Button variant="primary" disabled={none || loading} onClick={onStart}>
        Start quiz
      </Button>
    </div>
  )
}
