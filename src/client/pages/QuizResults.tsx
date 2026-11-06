import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, buttonClass } from '@/components/Button'
import { Segmented } from '@/components/Filters'
import { CategoryBreakdown, ReviewEntryCard } from '@/components/QuizReview'
import { QuizScore } from '@/components/QuizScore'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import type { QuizState } from '../../shared/quiz'

const SHOW = [
  { value: 'all', label: 'All' },
  { value: 'missed', label: 'Missed only' },
] as const

/**
 * Review answers, fetched only when open. It starts open after an at-the-end quiz, the only place
 * you see what you got wrong, and collapsed after an after-each one.
 */
function ReviewAnswers({ quizId, startOpen }: { quizId: number; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const [show, setShow] = useState<(typeof SHOW)[number]['value']>('all')
  const panelId = useId()

  const review = useQuery({
    queryKey: ['quiz-review', quizId],
    queryFn: async () => readJson(await api.api.quizzes[':id'].review.$get({ param: { id: String(quizId) } })),
    enabled: open,
  })
  const entries = (review.data ?? []).filter((entry) => show === 'all' || entry.outcome !== 'correct')

  return (
    <section aria-labelledby={`${panelId}-heading`}>
      <h2 id={`${panelId}-heading`} className="text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-3 text-left shadow-card hover:border-accent"
        >
          Review answers
          <ChevronDown className={`size-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </h2>
      {open && (
        <div id={panelId} className="mt-3 animate-rise space-y-3">
          {review.isPending && <Spinner />}
          {review.isError && (
            <p role="alert" className="text-sm font-semibold text-wrong-ink">
              Couldn't load your answers: {review.error.message}
            </p>
          )}
          {review.data && review.data.length === 0 && <p className="text-sm text-ink-soft">No questions were answered.</p>}
          {review.data && review.data.length > 0 && (
            <>
              <Segmented label="Show" value={show} options={SHOW} onChange={setShow} />
              {entries.length === 0 && <p className="text-sm text-ink-soft">Nothing missed. Well done.</p>}
              {entries.map((entry) => (
                <ReviewEntryCard key={entry.questionId} entry={entry} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  )
}

/** The end of a quiz: the score, how each category went, Retry missed and the answers to review. */
export function QuizResults({ quiz }: { quiz: QuizState }) {
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  const retry = useMutation({
    mutationFn: async () => readJson(await api.api.quizzes[':id'].retry.$post({ param: { id: String(quiz.id) } })),
    onSuccess: ({ id }) => navigate(`/quiz/${id}`),
  })
  const summary = quiz.summary

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
        <h1 ref={heading} tabIndex={-1} className="text-xl outline-none">
          Quiz finished
        </h1>
        <p className="mb-4 text-sm break-words text-ink-soft">
          {quiz.exam}
          {summary && ` · ${summary.label}`}
        </p>
        {quiz.results && <QuizScore results={quiz.results} />}

        <div className="mt-5 flex flex-wrap gap-2.5">
          {summary && summary.missed > 0 && (
            <Button variant="primary" loading={retry.isPending} onClick={() => retry.mutate()}>
              <RotateCcw className="size-4" aria-hidden="true" /> Retry missed ({summary.missed})
            </Button>
          )}
          {summary && (
            <Link
              to={`/exam/${summary.examId}`}
              className={buttonClass({ variant: summary.missed > 0 ? 'secondary' : 'primary' })}
            >
              Practise again
            </Link>
          )}
          <Link to="/" className={buttonClass({ variant: 'ghost' })}>
            Back to home
          </Link>
        </div>
        {retry.isError && (
          <p role="alert" className="mt-3 text-sm font-semibold text-wrong-ink">
            Couldn't start the retry: {retry.error.message}
          </p>
        )}
      </div>

      {summary && summary.byCategory.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <CategoryBreakdown categories={summary.byCategory} />
        </div>
      )}

      <ReviewAnswers quizId={quiz.id} startOpen={quiz.feedback === 'at_end'} />
    </div>
  )
}
