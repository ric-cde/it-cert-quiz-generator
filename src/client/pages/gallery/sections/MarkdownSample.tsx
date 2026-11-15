import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'

const MARKDOWN_SAMPLE = `Which **two** statements about \`sealed\` classes are true?

- A permitted subclass must be \`final\`, \`sealed\` or \`non-sealed\`
- See the [Java Language Specification](https://docs.oracle.com/javase/specs/)

| Modifier | Can be extended? |
|---|---|
| \`final\` | No |
| \`non-sealed\` | Yes |

> Raw HTML in a question is dropped, so this is safe: <script>alert('nope')</script>
`

export function MarkdownSample() {
  return (
    <Card padding="lg" className="max-w-2xl">
      <Markdown>{MARKDOWN_SAMPLE}</Markdown>
    </Card>
  )
}
