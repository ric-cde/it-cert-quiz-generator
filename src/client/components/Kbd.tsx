import clsx from 'clsx'
import type { ReactNode } from 'react'

/** A keycap, for showing keyboard shortcuts. Hidden on a phone, where there are no keys to press. */
export function Kbd({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'on-accent' }) {
  return (
    <kbd
      className={clsx(
        'inline-flex h-6 min-w-6 items-center max-sm:hidden justify-center rounded-sm border border-b-2 px-1.5 font-mono text-xs font-medium',
        tone === 'plain' && 'border-line-strong bg-surface text-ink-soft',
        tone === 'on-accent' && 'border-on-accent/50 bg-on-accent/10 text-on-accent',
      )}
    >
      {children}
    </kbd>
  )
}
