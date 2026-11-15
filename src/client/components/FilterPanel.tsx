import type { ReactNode } from 'react'
import { Kbd } from './Kbd'
import { Card } from './Card'

/** Holds the filters, fitting as many on a line as the width allows. */
export function FilterPanel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <Card padding="sm">
      <div className="flex flex-wrap gap-x-6 gap-y-4">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </Card>
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
