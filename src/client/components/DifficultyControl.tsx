import { Button } from './Button'

export const MIN_DIFFICULTY = 0
export const MAX_DIFFICULTY = 10

/**
 * A question's difficulty for you, from 0 to 10, between a -1 and a +1 button that move it a step.
 * It sits on the card's action row once a question is locked. The word hides on a phone, leaving
 * the number. Experimental, behind the `difficultyButtons` flag.
 */
export function DifficultyControl({
  difficulty,
  busy = false,
  onChange,
}: {
  difficulty: number
  busy?: boolean
  onChange: (change: 1 | -1) => void
}) {
  return (
    <span role="group" aria-label="Difficulty" className="flex items-center">
      <Button
        size="sm"
        variant="ghost"
        className="px-1.5! tabular-nums"
        aria-label="Lower difficulty by 1"
        title="Easier than that: one step down (Down arrow)"
        disabled={busy || difficulty <= MIN_DIFFICULTY}
        onClick={() => onChange(-1)}
      >
        −1
      </Button>
      <span
        className="px-1 text-sm whitespace-nowrap text-ink-soft"
        title="How hard this question is for you, from 0 to 10"
        aria-live="polite"
      >
        <span className="max-sm:sr-only">Difficulty </span>
        <span className="font-bold text-ink tabular-nums">{difficulty}</span>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="px-1.5! tabular-nums"
        aria-label="Raise difficulty by 1"
        title="Harder than that: one step up (Up arrow)"
        disabled={busy || difficulty >= MAX_DIFFICULTY}
        onClick={() => onChange(1)}
      >
        +1
      </Button>
    </span>
  )
}
