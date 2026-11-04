import clsx from 'clsx'
import { Check, CircleDashed, Clock, Eye, Minus, X } from 'lucide-react'

export type VerdictKind = 'correct' | 'partial' | 'incorrect' | 'revealed' | 'skipped' | 'pending'

const verdicts: Record<VerdictKind, { label: string; icon: typeof Check; className: string }> = {
  correct: { label: 'Correct', icon: Check, className: 'bg-correct-soft text-correct-ink' },
  partial: { label: 'Partly correct', icon: Minus, className: 'bg-amber-soft text-amber-ink' },
  incorrect: { label: 'Incorrect', icon: X, className: 'bg-wrong-soft text-wrong-ink' },
  revealed: { label: 'Revealed', icon: Eye, className: 'bg-wrong-soft text-wrong-ink' },
  skipped: { label: 'Skipped', icon: CircleDashed, className: 'bg-sunken text-ink-soft' },
  pending: { label: 'Not judged yet', icon: Clock, className: 'bg-accent-soft text-accent-strong' },
}

export function Verdict({ kind }: { kind: VerdictKind }) {
  const { label, icon: Icon, className } = verdicts[kind]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold', className)}>
      <Icon className="size-3.5" strokeWidth={3} aria-hidden="true" />
      {label}
    </span>
  )
}
