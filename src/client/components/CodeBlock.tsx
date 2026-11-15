import clsx from 'clsx'
import { CodeXml, Maximize2, Settings, WrapText, X } from 'lucide-react'
import { Dialog, DropdownMenu } from 'radix-ui'
import { type ReactNode, useEffect, useState } from 'react'
import { useCodeWrap } from '@/lib/code-wrap'
import { highlight, resolveLanguage } from '@/lib/highlight'
import { useSyntaxHighlighting } from '@/lib/settings'

const iconButton =
  'flex size-8 cursor-pointer items-center justify-center rounded-sm bg-code-bg text-code-ink/80 transition-colors hocus:bg-code-soft hocus:text-code-ink focus-visible:outline-code-ink data-[state=open]:bg-code-soft'

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent-soft data-highlighted:text-accent-strong'

/** How far a line is indented, in characters, counting a tab as four as the code block shows it. */
export function indentOf(line: string) {
  const leading = /^[ \t]*/.exec(line)?.[0] ?? ''
  return [...leading].reduce((width, char) => width + (char === '\t' ? 4 : 1), 0)
}

/**
 * A line's indent as spaces that can't break, so a wrapping line never breaks inside its own
 * indent and leaves a blank row. `space` is a no-break space, as text or as HTML.
 */
function hardIndent(line: string, space: string) {
  return line.replace(/^[ \t]+/, (leading) => space.repeat(indentOf(leading)))
}

/** Plain code's lines, ready to wrap. */
export function wrappableLines(code: string) {
  return code.split('\n').map((line) => ({ indent: indentOf(line), text: hardIndent(line, '\u00a0') }))
}

/**
 * Highlighted code ready to wrap. Shiki puts a newline between its line spans, which would show as
 * blank lines once each line is its own block, so they go. Each line is given its indent, so when
 * it wraps, the rest of it lines up a little further in than the line itself.
 */
export function wrappableHtml(html: string, code: string) {
  const indents = code.split('\n').map(indentOf)
  let index = 0
  return html
    .replace(/<\/span>\n<span class="line"/g, '</span><span class="line"')
    .replace(
      /<span class="line">((?:<span[^>]*>)?)([ \t]*)/g,
      (_, open: string, leading: string) =>
        `<span style="--indent:${indents[index++] ?? 0}ch" class="line">${open}${hardIndent(leading, '&nbsp;')}`,
    )
}

/** Code can sit inside an answer option's label, and pressing its buttons shouldn't select the answer. */
function keepFromLabel(event: React.MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

/** A tick in the menu for an option that's on. */
function OnMark({ on }: { on: boolean }) {
  return (
    <span className={clsx('ml-auto pl-4 text-xs font-semibold', on ? 'text-accent-strong' : 'text-ink-soft')}>
      {on ? 'On' : 'Off'}
    </span>
  )
}

/**
 * The cog in a code block's corner, opening its options: wrap long lines, syntax highlighting
 * (where the language is known) and, when `onFullScreen` is given, full screen.
 */
function CodeOptions({ canHighlight, onFullScreen }: { canHighlight: boolean; onFullScreen?: () => void }) {
  const syntax = useSyntaxHighlighting()
  const { wrap, toggle: toggleWrap } = useCodeWrap()
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={iconButton}
        aria-label="Code options"
        title="Code options"
        onClick={keepFromLabel}
      >
        <Settings className="size-4" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-[60] min-w-52 animate-rise rounded-md border border-line bg-surface p-1 text-ink shadow-raised"
        >
          <DropdownMenu.CheckboxItem checked={wrap} onCheckedChange={toggleWrap} className={menuItem}>
            <WrapText className="size-4" aria-hidden="true" /> Wrap long lines <OnMark on={wrap} />
          </DropdownMenu.CheckboxItem>
          {canHighlight && (
            <DropdownMenu.CheckboxItem checked={syntax.enabled} onCheckedChange={syntax.toggle} className={menuItem}>
              <CodeXml className="size-4" aria-hidden="true" /> Syntax highlighting <OnMark on={syntax.enabled} />
            </DropdownMenu.CheckboxItem>
          )}
          {onFullScreen && (
            <DropdownMenu.Item onSelect={onFullScreen} className={menuItem}>
              <Maximize2 className="size-4" aria-hidden="true" /> Full screen
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** The code itself, highlighted once that's ready, laid out to wrap or to scroll. */
function CodeText({ code, html, wrap }: { code: string; html: string | null; wrap: boolean }) {
  if (html) return <div dangerouslySetInnerHTML={{ __html: wrap ? wrappableHtml(html, code) : html }} />
  return (
    <pre>
      <code>
        {wrap
          ? wrappableLines(code).map((line, index) => (
              <span key={index} className="line" style={{ '--indent': `${line.indent}ch` } as React.CSSProperties}>
                {line.text}
              </span>
            ))
          : code}
      </code>
    </pre>
  )
}

/** The code on its own, filling the screen, so a phone turned on its side shows more of each line. */
function FullScreenCode({
  open,
  onClose,
  canHighlight,
  children,
}: {
  open: boolean
  onClose: () => void
  canHighlight: boolean
  children: ReactNode
}) {
  const { wrap } = useCodeWrap()
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="code-block fixed inset-0 z-50 flex flex-col bg-code-bg text-code-ink"
          data-wrap={wrap || undefined}
        >
          <div className="flex flex-none items-center justify-between gap-2 border-b border-code-soft py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
            <Dialog.Title className="text-sm font-semibold text-code-ink/80">Code</Dialog.Title>
            <div className="flex gap-1">
              <CodeOptions canHighlight={canHighlight} />
              <Dialog.Close
                className={clsx(iconButton, 'size-10 text-code-ink')}
                aria-label="Close full screen"
                title="Close full screen"
              >
                <X className="size-6" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <div
            tabIndex={0}
            className="min-h-0 flex-1 overflow-auto py-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] focus-visible:outline-code-ink"
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * A block of code, with a cog in its corner for its options: wrap long lines, syntax highlighting
 * and full screen.
 *
 * Long lines scroll sideways, or wrap with the rest of the line indented. Wrapping is the default
 * on a phone, and the cog floats in the top corner so the first lines wrap short of it. Scrolling
 * keeps it over the code, with room at the end of each line to scroll out from under it.
 */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const syntax = useSyntaxHighlighting()
  const { wrap } = useCodeWrap()
  const [html, setHtml] = useState<string | null>(null)
  const [fullScreen, setFullScreen] = useState(false)

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

  return (
    <div className="code-block relative rounded-md bg-code-bg text-code-ink" data-wrap={wrap || undefined}>
      {/*
        The cog stays in the same place in both layouts, so pressing it keeps its focus. When
        scrolling it's positioned against the outer box, so it doesn't scroll with the code.
      */}
      <div
        tabIndex={wrap ? undefined : 0}
        className={wrap ? 'py-3 pr-1.5 pl-4' : 'overflow-x-auto py-3 pr-11 pl-4 focus-visible:outline-code-ink'}
      >
        <div className={wrap ? 'float-right -mt-1.5 -mr-0.5 ml-2' : 'absolute top-1.5 right-1.5'}>
          <CodeOptions canHighlight={canHighlight} onFullScreen={() => setFullScreen(true)} />
        </div>
        <CodeText code={code} html={html} wrap={wrap} />
      </div>
      <FullScreenCode open={fullScreen} onClose={() => setFullScreen(false)} canHighlight={canHighlight}>
        <CodeText code={code} html={html} wrap={wrap} />
      </FullScreenCode>
    </div>
  )
}
