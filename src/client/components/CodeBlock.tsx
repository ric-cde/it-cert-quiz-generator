import clsx from 'clsx'
import { Check, CodeXml, Copy, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { highlight, resolveLanguage } from '@/lib/highlight'
import { useSyntaxHighlighting } from '@/lib/settings'

type CopyState = 'idle' | 'copied' | 'failed'

const copyLabels: Record<CopyState, string> = {
  idle: 'Copy code',
  copied: 'Copied',
  failed: 'Copy failed',
}

const iconButton =
  'flex size-8 cursor-pointer items-center justify-center rounded-sm bg-code-bg transition-colors hover:bg-code-soft hover:text-code-ink focus-visible:outline-code-ink'

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const syntax = useSyntaxHighlighting()
  const [html, setHtml] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Only offered where it would change something: not on a block with no known language.
  const canHighlight = syntax.ready && resolveLanguage(language) !== undefined

  useEffect(() => {
    setHtml(null)
    if (!syntax.enabled) return

    let current = true
    highlight(code, language)
      .then((result) => {
        if (current) setHtml(result)
      })
      // Highlighting is a nicety: plain code is still readable if it fails.
      .catch(() => {})
    return () => {
      current = false
    }
  }, [code, language, syntax.enabled])

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  // Code can sit inside an answer option's label, and these buttons shouldn't select the answer.
  function keepFromLabel(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  async function copy(event: React.MouseEvent) {
    keepFromLabel(event)
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

  const CopyIcon = copyState === 'copied' ? Check : copyState === 'failed' ? TriangleAlert : Copy
  const scrollClass = clsx(
    'overflow-x-auto py-3 pl-4 focus-visible:outline-code-ink',
    canHighlight ? 'pr-20' : 'pr-11',
  )

  return (
    <div className="code-block relative rounded-md bg-code-bg text-code-ink">
      <div className="absolute top-1.5 right-1.5 flex gap-0.5">
        {canHighlight && (
          <button
            type="button"
            onClick={(event) => {
              keepFromLabel(event)
              syntax.toggle()
            }}
            aria-label="Syntax highlighting"
            aria-pressed={syntax.enabled}
            title={`Syntax highlighting: ${syntax.enabled ? 'on' : 'off'}`}
            className={clsx(iconButton, syntax.enabled ? 'text-code-keyword' : 'text-code-ink/80')}
          >
            <CodeXml className="size-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label={copyLabels[copyState]}
          title={copyLabels[copyState]}
          className={clsx(iconButton, 'text-code-ink/80')}
        >
          <CopyIcon key={copyState} className="size-4 animate-pop" aria-hidden="true" />
        </button>
      </div>
      {html ? (
        <div tabIndex={0} className={scrollClass} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre tabIndex={0} className={scrollClass}>
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
