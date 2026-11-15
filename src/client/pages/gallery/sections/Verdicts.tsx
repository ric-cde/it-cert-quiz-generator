import { Verdict, type VerdictKind } from '@/components/Verdict'

const VERDICTS: VerdictKind[] = ['correct', 'partial', 'incorrect', 'revealed', 'skipped', 'pending']

export function Verdicts() {
  return (
    <div className="flex flex-wrap gap-2">
      {VERDICTS.map((kind) => (
        <Verdict key={kind} kind={kind} />
      ))}
    </div>
  )
}
