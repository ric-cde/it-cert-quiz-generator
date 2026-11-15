import clsx from 'clsx'
import { type Ref, useState } from 'react'
import { inputClass } from './Field'
import { Segmented } from './Segmented'

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
  // What's typed, while it isn't a number yet (such as when you've just cleared it). The cap stays
  // as it was until you type one. Picking a preset, or leaving the field, shows the cap again.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = isPreset ? '' : String(value)
  const text = draft !== null && (draft === '' || parseMaxQuestions(draft) === value) ? draft : shown

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
        value={text}
        onChange={(event) => {
          setDraft(event.target.value)
          const parsed = parseMaxQuestions(event.target.value)
          if (parsed !== null) onChange?.(parsed)
        }}
        onBlur={() => setDraft(null)}
        // Three digits is plenty. Left blank: a placeholder standing in for a label is a known
        // usability problem, and the field's label is there for screen readers.
        className={clsx(inputClass(), 'w-[4.25rem]')}
      />
    </div>
  )
}
