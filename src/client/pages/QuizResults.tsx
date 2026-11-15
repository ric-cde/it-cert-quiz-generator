import { useMutation, useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, buttonClass } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { CategoryBreakdown, ReviewEntryCard } from '@/components/QuizReview'
import { QuizScore } from '@/components/QuizScore'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import type { QuizState } from '@shared/quiz'
import { ErrorText } from '@/components/Notices'
import { Card } from '@/components/Card'
import { Disclosure } from '@/components/Disclosure'

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
  const headingId = useId()

  const review = useQuery({
    queryKey: ['quiz-review', quizId],
    queryFn: async () => readJson(await api.api.quizzes[':id'].review.$get({ param: { id: String(quizId) } })),
    enabled: open,
  })
  const entries = (review.data ?? []).filter((entry) => show === 'all' || entry.outcome !== 'correct')

  return (
    <section aria-labelledby={headingId}>
      <Disclosure
        summary="Review answers"
        tone="card"
        heading={{ level: 'h2', id: headingId }}
        open={open}
        onToggle={() => setOpen((value) => !value)}
        contentClassName="space-y-3"
      >
        {review.isPending && <Spinner />}
        {review.isError && <ErrorText>Couldn't load your answers: {review.error.message}</ErrorText>}
        {review.data && review.data.length === 0 && (
          <p className="text-sm text-ink-soft">No questions were answered.</p>
        )}
        {review.data && review.data.length > 0 && (
          <>
            <Segmented label="Show" value={show} options={SHOW} onChange={setShow} />
            {entries.length === 0 && <p className="text-sm text-ink-soft">Nothing missed. Well done.</p>}
            {entries.map((entry) => (
              <ReviewEntryCard key={entry.questionId} entry={entry} />
            ))}
          </>
        )}
      </Disclosure>
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
      <Card padding="lg">
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
        {retry.isError && <ErrorText className="mt-3">Couldn't start the retry: {retry.error.message}</ErrorText>}
      </Card>

      {summary && summary.byCategory.length > 0 && (
        <Card padding="lg">
          <CategoryBreakdown categories={summary.byCategory} />
        </Card>
      )}

      <ReviewAnswers quizId={quiz.id} startOpen={quiz.feedback === 'at_end'} />
    </div>
  )
}
