import clsx from 'clsx'
import type { ReactNode } from 'react'
import { cardClass } from './Card'

/**
 * The card around a question, with an optional footer below a rule. After a reveal the whole card shifts to a slightly different
 * background, so it can't be mistaken for an answer you got right.
 */
export function QuestionCard({
  revealed = false,
  fullWidthOnPhone = false,
  footer,
  children,
}: {
  revealed?: boolean
  /**
   * Edge to edge on a phone, with no side borders, for the most room across. Only for a card that
   * sits straight in the page, whose side padding it reaches out over.
   */
  fullWidthOnPhone?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      data-revealed={revealed || undefined}
      className={clsx(
        cardClass({ padding: 'lg', tone: revealed ? 'sunken' : 'surface' }),
        // A little narrower padding on a phone. QuizActions' pinned row reaches out over it.
        'mx-auto max-w-2xl transition-colors duration-200 max-sm:px-4',
        fullWidthOnPhone && 'max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0',
      )}
    >
      {children}
      {footer && (
        <div
          className={clsx('mt-5 flex justify-end border-t pt-3', revealed ? 'border-line-strong/60' : 'border-line')}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
