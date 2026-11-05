import { TriangleAlert } from 'lucide-react'

/**
 * Sits on a question whose answer is in doubt. The note itself often names the answer, so it's held
 * back until the question has been answered.
 */
export function ReviewNotice({ note, answered }: { note: string; answered: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber bg-amber-soft px-3 py-2 text-sm">
      <TriangleAlert className="mt-0.5 size-4 flex-none text-amber-ink" aria-hidden="true" />
      <p className="min-w-0 break-words">
        <span className="font-semibold">The marked answer to this question is in doubt.</span>
        {answered && ` ${note}`}
      </p>
    </div>
  )
}
