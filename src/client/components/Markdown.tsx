import clsx from 'clsx'
import { isValidElement, type ReactElement } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

const remarkPlugins = [remarkGfm]

const components: Components = {
  pre({ children }) {
    const code = isValidElement(children)
      ? (children as ReactElement<{ className?: string; children?: unknown }>)
      : undefined
    const language = code?.props.className?.match(/language-(\S+)/)?.[1]
    const text = String(code?.props.children ?? '').replace(/\n$/, '')
    return <CodeBlock code={text} language={language} />
  },
  a({ children, href }) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  },
  // Images aren't supported in v1. Show the description rather than loading from a third party.
  img({ alt }) {
    return <span className="text-ink-soft italic">[Image: {alt || 'no description'}]</span>
  },
}

/**
 * Question and option text. It comes from third parties, so raw HTML is never rendered
 * (react-markdown leaves it out unless a plugin such as rehype-raw is added: don't add one).
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={clsx('prose-quiz', className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  )
}
