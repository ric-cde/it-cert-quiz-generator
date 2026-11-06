import clsx from 'clsx'
import { Flag } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from './Button'
import { inputClass } from './Field'

/**
 * One press flags the question straight away, so a broken question costs no effort. It sits on the
 * card's action row, and the same button unflags. The word hides on a phone, leaving the icon.
 */
export function FlagButton({
  flagged,
  busy = false,
  onFlag,
  onUnflag,
}: {
  flagged: boolean
  busy?: boolean
  onFlag: () => void
  onUnflag: () => void
}) {
  const label = flagged ? 'Unflag' : 'Flag'
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={label}
      title={flagged ? 'Unflag this question' : 'Flag this question, to leave it out of future quizzes'}
      disabled={busy}
      onClick={flagged ? onUnflag : onFlag}
    >
      <Flag className={clsx('size-4', flagged && 'fill-current text-amber-ink')} aria-hidden="true" />
      <span className="max-sm:sr-only">{label}</span>
    </Button>
  )
}

/**
 * Opens below the action row once a question is flagged. The reason is optional, and worth having
 * when you come back to the flagged list later.
 */
export function FlagReason({
  reason,
  busy = false,
  onSaveReason,
}: {
  reason: string | null
  busy?: boolean
  onSaveReason: (reason: string) => void
}) {
  const inputId = useId()
  const [draft, setDraft] = useState(reason ?? '')
  const unchanged = draft.trim() === (reason ?? '')

  return (
    <form
      className="w-full animate-rise rounded-md border border-amber/60 bg-amber-soft px-3.5 py-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!unchanged) onSaveReason(draft.trim())
      }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Flag className="size-4 fill-current text-amber-ink" aria-hidden="true" />
        Flagged, so it's left out of future quizzes
      </p>
      <label htmlFor={inputId} className="mt-2 block text-xs text-ink-soft">
        What's wrong with it? (optional)
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          className={clsx(inputClass(), 'min-w-0 flex-1 basis-48 text-sm')}
        />
        <Button type="submit" size="sm" disabled={busy || unchanged}>
          Save reason
        </Button>
      </div>
    </form>
  )
}
