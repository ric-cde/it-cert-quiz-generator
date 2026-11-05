import clsx from 'clsx'
import { Flag } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from './Button'
import { inputClass } from './Field'

/**
 * One press flags the question straight away, so a broken question costs no effort. The reason is
 * optional, and worth having when you come back to the flagged list later.
 */
export function FlagControl({
  flagged,
  reason,
  busy = false,
  onFlag,
  onUnflag,
  onSaveReason,
}: {
  flagged: boolean
  reason: string | null
  busy?: boolean
  onFlag: () => void
  onUnflag: () => void
  onSaveReason: (reason: string) => void
}) {
  const inputId = useId()
  const [draft, setDraft] = useState(reason ?? '')

  if (!flagged) {
    return (
      <Button size="sm" variant="ghost" disabled={busy} onClick={onFlag}>
        <Flag className="size-4" aria-hidden="true" /> Flag
      </Button>
    )
  }

  const unchanged = draft.trim() === (reason ?? '')
  return (
    <form
      className="w-full"
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
        <Button size="sm" variant="ghost" disabled={busy} onClick={onUnflag}>
          Unflag
        </Button>
      </div>
    </form>
  )
}
