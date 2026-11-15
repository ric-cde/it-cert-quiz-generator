const COLOUR_GROUPS: { name: string; tokens: string[] }[] = [
  { name: 'Paper', tokens: ['paper', 'surface', 'sunken', 'line', 'line-strong'] },
  { name: 'Ink', tokens: ['ink', 'ink-soft'] },
  { name: 'Accent: what you are doing', tokens: ['accent', 'accent-strong', 'accent-soft', 'on-accent'] },
  { name: 'Correct', tokens: ['correct', 'correct-ink', 'correct-soft'] },
  { name: 'Incorrect', tokens: ['wrong', 'wrong-ink', 'wrong-soft'] },
  { name: 'Attempted, not yet right', tokens: ['amber', 'amber-ink', 'amber-soft'] },
  {
    name: 'Code',
    tokens: [
      'code-bg',
      'code-ink',
      'code-soft',
      'code-comment',
      'code-string',
      'code-constant',
      'code-keyword',
      'code-operator',
      'code-function',
      'code-type',
    ],
  },
]
export function Colours() {
  return (
    <div className="space-y-5">
      {COLOUR_GROUPS.map((group) => (
        <div key={group.name}>
          <p className="mb-2 text-sm font-semibold">{group.name}</p>
          <div className="flex flex-wrap gap-3">
            {group.tokens.map((token) => (
              <div key={token} className="w-24">
                <div className="h-12 rounded-md border border-line" style={{ background: `var(--color-${token})` }} />
                <p className="mt-1 font-mono text-xs break-words text-ink-soft">{token}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
