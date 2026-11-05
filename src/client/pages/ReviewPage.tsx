import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnswerOption } from '@/components/AnswerOption'
import { Button } from '@/components/Button'
import { Markdown } from '@/components/Markdown'
import { QuestionExplanation } from '@/components/QuestionExplanation'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import type { QuestionToReview, ReviewDecision } from '../../shared/review'

function ReviewCard({ question }: { question: QuestionToReview }) {
  const queryClient = useQueryClient()
  const name = useId()
  const [editing, setEditing] = useState(false)
  const [chosen, setChosen] = useState<number[]>([])

  const decide = useMutation({
    mutationFn: async (decision: ReviewDecision) =>
      readJson(await api.api.review[':id'].$post({ param: { id: String(question.id) }, json: decision })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['review'] })
      void queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })

  const multi = question.type === 'multi'

  function startEditing() {
    setChosen(question.options.filter((option) => option.isCorrect).map((option) => option.id))
    setEditing(true)
  }

  function toggle(id: number) {
    if (multi) setChosen((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]))
    else setChosen([id])
  }

  return (
    <article aria-label={question.externalId ?? `Question ${question.id}`} className="rounded-lg border border-line bg-surface p-5">
      <p className="mb-3 text-xs break-words text-ink-soft">
        {question.source}, {question.chapter}
        {question.externalId && ` · ${question.externalId}`}
      </p>

      <p className="mb-4 rounded-md border border-amber bg-amber-soft px-3 py-2 text-sm break-words">
        <span className="font-semibold">Why it needs review:</span> {question.reviewNote}
      </p>

      <Markdown>{question.bodyMd}</Markdown>

      {question.type === 'free_form' ? (
        <div className="mt-3 rounded-md border border-line bg-sunken px-3.5 py-3">
          <p className="mb-1 text-xs font-bold text-ink-soft">Model answer</p>
          <Markdown>{question.modelAnswerMd ?? ''}</Markdown>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {question.options.map((option) => (
            <AnswerOption
              key={option.id}
              kind={multi ? 'multi' : 'single'}
              name={name}
              state={
                editing
                  ? chosen.includes(option.id)
                    ? 'selected'
                    : 'idle'
                  : option.isCorrect
                    ? 'correct-missed'
                    : 'neutral'
              }
              onToggle={() => toggle(option.id)}
              explanation={!editing && option.explanationMd ? <Markdown>{option.explanationMd}</Markdown> : undefined}
            >
              <Markdown>{option.bodyMd}</Markdown>
            </AnswerOption>
          ))}
        </div>
      )}

      {!editing && question.explanationMd && <QuestionExplanation markdown={question.explanationMd} />}

      {decide.isError && (
        <p role="alert" className="mt-3 text-sm font-semibold text-wrong-ink">
          Couldn't save that: {decide.error.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {editing ? (
          <>
            <Button
              variant="primary"
              size="sm"
              loading={decide.isPending}
              disabled={chosen.length === 0}
              onClick={() => decide.mutate({ action: 'change-answer', correctOptionIds: chosen })}
            >
              Save this answer
            </Button>
            <Button variant="ghost" size="sm" disabled={decide.isPending} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ action: 'keep' })}>
              It's fine, keep it
            </Button>
            {question.type !== 'free_form' && (
              <Button size="sm" disabled={decide.isPending} onClick={startEditing}>
                Change the answer
              </Button>
            )}
            <Button size="sm" variant="danger" disabled={decide.isPending} onClick={() => decide.mutate({ action: 'take-out' })}>
              Take out of quizzes
            </Button>
          </>
        )}
      </div>
    </article>
  )
}

/** Questions that came in with a doubt. They stay in quizzes with a warning until settled here. */
export function ReviewPage() {
  const [params] = useSearchParams()
  const sourceId = params.get('source') ?? undefined

  const questions = useQuery({
    queryKey: ['review', sourceId],
    queryFn: async () => readJson(await api.api.review.$get({ query: { sourceId } })),
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl">Questions to review</h1>
      <p className="mt-1 text-ink-soft">
        Something about these looked wrong when they were made. They stay in quizzes with a warning until you decide.
      </p>
      {sourceId && (
        <p className="mt-2 text-sm">
          <Link to="/review">Show every source</Link>
        </p>
      )}

      {questions.isPending && (
        <p className="mt-6">
          <Spinner />
        </p>
      )}
      {questions.isError && (
        <p role="alert" className="mt-6 text-sm font-semibold text-wrong-ink">
          Couldn't load these: {questions.error.message}
        </p>
      )}
      {questions.data?.length === 0 && (
        <p className="mt-6">
          Nothing left to review. <Link to="/import">Back to import</Link>
        </p>
      )}
      {questions.data && questions.data.length > 0 && (
        <div className="mt-6 space-y-4">
          {questions.data.map((question) => (
            <ReviewCard key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  )
}
