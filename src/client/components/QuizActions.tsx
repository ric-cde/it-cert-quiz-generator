import clsx from 'clsx'
import type { ReactNode } from 'react'
import { buttonClass } from './Button'
import { Kbd } from './Kbd'

/** Narrower buttons on a phone, so the whole row fits on one line. */
export const rowButton = 'max-sm:px-3'

/**
 * The question card's action row, in three fixed places:
 *
 * - the answer actions on the left, such as Submit and Reveal answer, or the verdict
 * - tools about the question, such as Flag, in the middle
 * - Next on the right
 *
 * Next's place is always kept, even while it isn't shown, so the tools never jump about as the
 * buttons around them change.
 *
 * With `pinned`, on a phone the row sticks to the bottom of the screen while the question is taller
 * than it, so Next is always in the same place under your thumb. It then spans the question card,
 * so it must be the card's child: a `QuestionCard`, whose side padding on a phone is `px-4`.
 */
export function QuizActions({
  children,
  tools,
  end,
  pinned = false,
}: {
  children?: ReactNode
  tools?: ReactNode
  end?: ReactNode
  pinned?: boolean
}) {
  return (
    <div
      data-pinned={pinned || undefined}
      className={clsx(
        'mt-5 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:gap-2.5',
        pinned &&
          'max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:border-line max-sm:bg-inherit max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
      )}
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">{children}</div>
      <div className="flex items-center gap-1">{tools}</div>
      <div className="grid justify-items-end">
        <span
          aria-hidden="true"
          inert
          className={clsx(buttonClass({ variant: 'primary' }), rowButton, 'invisible [grid-area:1/1]')}
        >
          Next <Kbd tone="on-accent">Enter</Kbd>
        </span>
        {end && <div className="flex [grid-area:1/1]">{end}</div>}
      </div>
    </div>
  )
}
