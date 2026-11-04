import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none cursor-pointer ' +
  'transition-[background-color,border-color,color,transform,box-shadow] duration-100 active:translate-y-px ' +
  'focus-ring:outline-2 focus-ring:outline-offset-2 focus-ring:outline-accent ' +
  'disabled:cursor-not-allowed disabled:active:translate-y-0'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent shadow-key active:shadow-none hocus:bg-accent-strong ' +
    'disabled:bg-sunken disabled:text-ink-soft disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line-strong shadow-card hocus:border-ink-soft hocus:bg-paper ' +
    'disabled:bg-sunken disabled:text-ink-soft disabled:border-line disabled:shadow-none',
  ghost: 'text-accent hocus:bg-accent-soft disabled:text-ink-soft',
  danger:
    'bg-surface text-wrong-ink border border-line-strong shadow-card hocus:bg-wrong-soft hocus:border-wrong ' +
    'disabled:bg-sunken disabled:text-ink-soft disabled:border-line disabled:shadow-none',
}

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-base',
  sm: 'min-h-8 px-3 text-sm',
}

const iconSizes: Record<ButtonSize, string> = {
  md: 'size-11',
  sm: 'size-8',
}

/** Also used to style links that look like buttons. */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean } = {}) {
  return clsx(base, variants[variant], iconOnly ? iconSizes[size] : sizes[size])
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Square button holding only an icon. Give it an aria-label. */
  iconOnly?: boolean
  /** Shows a spinner and blocks clicks, for example while Claude is judging an answer. */
  loading?: boolean
  'data-force'?: string
}

export function Button({
  variant,
  size,
  iconOnly,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(buttonClass({ variant, size, iconOnly }), className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
