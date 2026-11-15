import { Check, Copy, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * An icon-only button that copies some text, worked out when it's pressed, and shows a tick for a
 * moment once it has. `label` is its name until then, such as "Copy question".
 */
export function CopyButton({ label, title, text }: { label: string; title?: string; text: () => string }) {
  const [state, setState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(resetTimer.current), [])

  async function copy() {
    let next: CopyState = 'copied'
    try {
      await navigator.clipboard.writeText(text())
    } catch {
      next = 'failed'
    }
    setState(next)
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setState('idle'), 1600)
  }

  const Icon = state === 'copied' ? Check : state === 'failed' ? TriangleAlert : Copy
  const name = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label
  return (
    <Button
      size="sm"
      variant="ghost"
      iconOnly
      aria-label={name}
      title={state === 'idle' ? (title ?? label) : name}
      onClick={copy}
    >
      <Icon key={state} className="size-4 animate-pop" aria-hidden="true" />
    </Button>
  )
}
