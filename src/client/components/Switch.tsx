import { Switch as RadixSwitch } from 'radix-ui'
import { type ReactNode, useId } from 'react'

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
        className="relative mt-0.5 h-6 w-10 flex-none cursor-pointer rounded-full bg-line-strong transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent"
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
