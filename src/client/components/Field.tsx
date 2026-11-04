import clsx from 'clsx'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

export function inputClass({ invalid = false, mono = false }: { invalid?: boolean; mono?: boolean } = {}) {
  return clsx(
    'min-h-9 rounded-md border bg-surface px-3 py-1.5 text-base text-ink transition-colors duration-100',
    'placeholder:text-ink-soft',
    'focus:outline-2 focus:outline-offset-0 focus:outline-accent focus:border-accent',
    'focus-ring:outline-2 focus-ring:outline-offset-0 focus-ring:outline-accent focus-ring:border-accent',
    'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-soft',
    invalid ? 'border-wrong' : 'border-line-strong',
    mono && 'font-mono text-sm',
  )
}

function FieldWrapper({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-semibold text-wrong-ink">
          {error}
        </p>
      )}
    </div>
  )
}

type FieldProps = { label: string; error?: ReactNode; 'data-force'?: string }

export function TextField({ label, error, className, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <FieldWrapper id={id} label={label} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(inputClass({ invalid: Boolean(error) }), 'w-full', className)}
        {...rest}
      />
    </FieldWrapper>
  )
}

/** Multi-line text, including the free-form answer box. `mono` suits code answers. */
export function TextArea({
  label,
  error,
  mono = false,
  className,
  ...rest
}: FieldProps & { mono?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FieldWrapper id={id} label={label} error={error}>
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(inputClass({ invalid: Boolean(error), mono }), 'block w-full resize-y', className)}
        {...rest}
      />
    </FieldWrapper>
  )
}
