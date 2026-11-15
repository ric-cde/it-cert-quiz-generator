import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useFeature } from '@/lib/features'

/** A keycap, for showing keyboard shortcuts. Hidden on a phone, where there are no keys to press, and when Settings turns hints off. */
export function Kbd({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'on-accent' }) {
  // Settings can turn the hints off. The shortcuts still work.
  if (!useFeature('shortcutHints')) return null
  return (
    <kbd
      className={clsx(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-b-2 px-1.5 font-mono text-xs font-medium max-sm:hidden',
        tone === 'plain' && 'border-line-strong bg-surface text-ink-soft',
        tone === 'on-accent' && 'border-on-accent/50 bg-on-accent/10 text-on-accent',
      )}
    >
      {children}
    </kbd>
  )
}
