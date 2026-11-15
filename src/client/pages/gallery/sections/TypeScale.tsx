const TYPE_SCALE = [
  ['text-2xl', 'Page title', 'text-2xl font-bold'],
  ['text-xl', 'Section heading', 'text-xl font-bold'],
  ['text-lg', 'Question text', 'text-lg'],
  ['text-base', 'Body and answer text', 'text-base'],
  ['text-sm', 'Per-answer text and controls', 'text-sm'],
  ['text-xs', 'Labels and counts', 'text-xs'],
] as const
export function TypeScale() {
  return (
    <div className="space-y-3">
      {TYPE_SCALE.map(([token, sample, className]) => (
        <div key={token} className="flex flex-wrap items-baseline gap-x-4">
          <span className="w-20 flex-none font-mono text-xs text-ink-soft">{token}</span>
          <span className={className}>{sample}</span>
        </div>
      ))}
      <div className="flex flex-wrap items-baseline gap-x-4">
        <span className="w-20 flex-none font-mono text-xs text-ink-soft">font-mono</span>
        <span className="font-mono text-sm">List&lt;Integer&gt; list = new ArrayList&lt;&gt;();</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4">
        <span className="w-20 flex-none font-mono text-xs text-ink-soft">legibility</span>
        <span className="text-lg">
          Il1 O0 rn m · <span className="font-mono">Il1 O0 rn m</span>
        </span>
      </div>
    </div>
  )
}
