import { Markdown } from './Markdown'

/** Text about the whole question, shown below its options once it's answered. */
export function QuestionExplanation({ markdown, generated = false }: { markdown: string; generated?: boolean }) {
  return (
    <div className="mt-4 rounded-md border border-line bg-sunken px-3.5 py-3 text-sm">
      <p className="mb-1 text-xs font-bold text-ink-soft">
        Explanation{generated && <span className="font-normal italic"> · Written by AI</span>}
      </p>
      <Markdown>{markdown}</Markdown>
    </div>
  )
}

/** Shown once, quietly, when a missed question has no explanation anywhere. Stage 10 adds Generate here. */
export function NoExplanation() {
  return <p className="mt-4 text-sm text-ink-soft">No explanation in this source yet.</p>
}
