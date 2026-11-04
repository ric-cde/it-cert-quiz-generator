import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * The card around a question. Actions about the question itself, such as Flag, sit in a footer
 * at the bottom, away from Next. After a reveal the whole card shifts to a slightly different
 * background, so it can't be mistaken for an answer you got right.
 */
export function QuestionCard({
  revealed = false,
  footer,
  children,
}: {
  revealed?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      data-revealed={revealed || undefined}
      className={clsx(
        'mx-auto max-w-2xl rounded-lg border p-5 shadow-card transition-colors duration-200 sm:p-6',
        revealed ? 'border-line-strong/60 bg-sunken' : 'border-line bg-surface',
      )}
    >
      {children}
      {footer && (
        <div className={clsx('mt-5 flex justify-end border-t pt-3', revealed ? 'border-line-strong/60' : 'border-line')}>
          {footer}
        </div>
      )}
    </div>
  )
}
