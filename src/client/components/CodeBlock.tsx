import { Check, Copy, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { highlight } from '@/lib/highlight'

type CopyState = 'idle' | 'copied' | 'failed'

const copyLabels: Record<CopyState, string> = {
  idle: 'Copy code',
  copied: 'Copied',
  failed: 'Copy failed',
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let current = true
    setHtml(null)
    highlight(code, language)
      .then((result) => {
        if (current) setHtml(result)
      })
      // Highlighting is a nicety: plain code is still readable if it fails.
      .catch(() => {})
    return () => {
      current = false
    }
  }, [code, language])

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  async function copy(event: React.MouseEvent) {
    // Code can sit inside an answer option's label, and copying shouldn't select the answer.
    event.preventDefault()
    event.stopPropagation()
    let next: CopyState = 'copied'
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      next = 'failed'
    }
    setCopyState(next)
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopyState('idle'), 1600)
  }

  const Icon = copyState === 'copied' ? Check : copyState === 'failed' ? TriangleAlert : Copy

  return (
    <div className="code-block relative rounded-md bg-code-bg text-code-ink">
      <button
        type="button"
        onClick={copy}
        aria-label={copyLabels[copyState]}
        title={copyLabels[copyState]}
        className="absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-sm bg-code-bg text-code-ink/80 transition-colors hover:bg-code-soft hover:text-code-ink focus-visible:outline-code-ink"
      >
        <Icon key={copyState} className="size-4 animate-pop" aria-hidden="true" />
      </button>
      {html ? (
        <div
          tabIndex={0}
          className="overflow-x-auto py-3 pr-11 pl-4 focus-visible:outline-code-ink"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre tabIndex={0} className="overflow-x-auto py-3 pr-11 pl-4 focus-visible:outline-code-ink">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
