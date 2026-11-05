import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import type { Feedback } from '../../shared/domain'
import { Button } from './Button'
import { Segmented } from './Filters'
import { Spinner } from './Spinner'

const FEEDBACK_NAMES: Record<Feedback, string> = { after_each: 'After each question', at_end: 'At the end' }
const SIZES = [
  { value: '5', label: '5' },
  { value: '20', label: '20' },
  { value: 'all', label: 'All' },
] as const

/** A temporary way to start and resume quizzes. Stage 6 replaces it with the take-exam screen. */
export function PracticeStart() {
  const navigate = useNavigate()
  const [size, setSize] = useState<(typeof SIZES)[number]['value']>('20')

  const options = useQuery({
    queryKey: ['quiz-start-options'],
    queryFn: async () => readJson(await api.api.quizzes['start-options'].$get()),
  })

  const start = useMutation({
    mutationFn: async (choice: { sourceId: number; feedback: Feedback }) =>
      readJson(
        await api.api.quizzes.$post({
          json: { ...choice, ...(size === 'all' ? {} : { limit: Number(size) }) },
        }),
      ),
    onSuccess: ({ id }) => navigate(`/quiz/${id}`),
  })

  const sources = options.data?.sources.filter((source) => source.available > 0) ?? []

  return (
    <section aria-labelledby="practice-heading" className="mt-6 rounded-lg border border-line bg-surface p-4 shadow-card">
      <h2 id="practice-heading" className="text-base">
        Practice
      </h2>
      <p className="mt-0.5 text-xs text-ink-soft">A temporary start, until the take-exam screen in Stage 6.</p>

      {options.isPending && (
        <p className="mt-3">
          <Spinner />
        </p>
      )}
      {options.isError && (
        <p role="alert" className="mt-3 text-sm font-semibold text-wrong-ink">
          Couldn't load your sources: {options.error.message}
        </p>
      )}

      {options.data && options.data.unfinished.length > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-semibold">Unfinished</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {options.data.unfinished.map((quiz) => (
              <li key={quiz.id}>
                <Link to={`/quiz/${quiz.id}`}>
                  Resume {quiz.source}: {quiz.position} of {quiz.total} done
                </Link>{' '}
                <span className="text-ink-soft">({FEEDBACK_NAMES[quiz.feedback].toLowerCase()})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {options.data && sources.length === 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Nothing to practise yet. <Link to="/import">Import some questions</Link> first.
        </p>
      )}

      {sources.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Questions</span>
            <Segmented label="Questions" value={size} options={SIZES} onChange={setSize} />
          </div>
          <ul className="mt-3 space-y-3">
            {sources.map((source) => (
              <li key={source.id} className="border-t border-line pt-3">
                <p className="text-sm font-semibold break-words">{source.name}</p>
                <p className="text-xs break-words text-ink-soft">
                  {source.exam}, {source.available} available
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-soft">Feedback:</span>
                  {(Object.keys(FEEDBACK_NAMES) as Feedback[]).map((feedback) => (
                    <Button
                      key={feedback}
                      size="sm"
                      disabled={start.isPending}
                      aria-label={`Start ${source.name}, feedback ${FEEDBACK_NAMES[feedback].toLowerCase()}`}
                      onClick={() => start.mutate({ sourceId: source.id, feedback })}
                    >
                      {FEEDBACK_NAMES[feedback]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {start.isError && (
        <p role="alert" className="mt-3 text-sm font-semibold text-wrong-ink">
          Couldn't start that quiz: {start.error.message}
        </p>
      )}
    </section>
  )
}
