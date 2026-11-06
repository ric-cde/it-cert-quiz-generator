import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ChevronDown, FileUp, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/components/Button'
import { ExamCard } from '@/components/ExamCard'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import { formatStarted } from '@/lib/quiz-words'
import type { ExamStatus } from '../../shared/selection'

/** Subjects, with their exams below them, each exam's sources with progress, and any unfinished quiz. */
export function HomePage() {
  const home = useQuery({ queryKey: ['home'], queryFn: async () => readJson(await api.api.home.$get()) })
  const me = useQuery({ queryKey: ['me'], queryFn: async () => readJson(await api.api.me.$get()) })
  const canEdit = me.data?.role === 'admin' || me.data?.role === 'editor'
  const queryClient = useQueryClient()
  const [showAbandoned, setShowAbandoned] = useState(false)

  const changeStatus = useMutation({
    mutationFn: async ({ examId, status }: { examId: number; status: ExamStatus }) =>
      readJson(await api.api.exams[':id'].status.$put({ param: { id: String(examId) }, json: { status } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  })
  const onStatus = (examId: number) => (status: ExamStatus) => changeStatus.mutate({ examId, status })

  if (home.isPending) {
    return (
      <p>
        <Spinner />
      </p>
    )
  }
  if (home.isError) {
    return (
      <p role="alert" className="font-semibold text-wrong-ink">
        Couldn't load your exams: {home.error.message}
      </p>
    )
  }

  const { subjects, passed, abandoned, unfinished } = home.data

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl">Your exams</h1>
        {canEdit && (
          <nav aria-label="Manage questions" className="flex flex-wrap gap-2">
            <Link to="/import" className={buttonClass({ size: 'sm', variant: 'ghost' })}>
              <FileUp className="size-4" aria-hidden="true" /> Import
            </Link>
            <Link to="/review" className={buttonClass({ size: 'sm', variant: 'ghost' })}>
              <ListChecks className="size-4" aria-hidden="true" /> Review flagged
            </Link>
          </nav>
        )}
      </div>

      {unfinished.length > 0 && (
        <section aria-labelledby="resume-heading" className="rounded-lg border border-accent/40 bg-accent-soft p-4">
          <h2 id="resume-heading" className="text-base">
            Unfinished {unfinished.length === 1 ? 'quiz' : 'quizzes'}
          </h2>
          {/*
            One grid for every row, so each column lines up across quizzes. Long names trail off.
            Narrower screens drop the exam, then the start time, keeping the name, progress and Resume.
          */}
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto]">
            {unfinished.map((quiz) => (
              <li key={quiz.id} className="col-span-full grid grid-cols-subgrid items-center text-sm">
                <span className="truncate font-semibold" title={quiz.label}>
                  {quiz.label}
                </span>
                <span className="hidden truncate text-ink-soft md:block" title={quiz.exam}>
                  {quiz.exam}
                </span>
                <span className="text-right whitespace-nowrap text-ink-soft tabular-nums">
                  {quiz.position} of {quiz.total}
                  <span className="max-sm:hidden"> done</span>
                </span>
                <span className="hidden whitespace-nowrap text-ink-soft tabular-nums sm:block">
                  {formatStarted(quiz.startedAt)}
                </span>
                <Link
                  to={`/quiz/${quiz.id}`}
                  aria-label={`Resume ${quiz.label}: ${quiz.position} of ${quiz.total} done`}
                  className={buttonClass({ size: 'sm', variant: 'primary' })}
                >
                  Resume <ArrowRight className="size-4 max-sm:hidden" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {subjects.map((subject) => (
        <section key={subject.id} aria-labelledby={`subject-${subject.id}`}>
          <h2 id={`subject-${subject.id}`} className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">
            {subject.name}
          </h2>
          <div className="space-y-4">
            {subject.exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onStatus={onStatus(exam.id)} />
            ))}
          </div>
        </section>
      ))}

      {changeStatus.isError && (
        <p role="alert" className="text-sm font-semibold text-wrong-ink">
          Couldn't change that exam: {changeStatus.error.message}
        </p>
      )}

      {passed.length > 0 && (
        <section aria-labelledby="passed-heading">
          <h2 id="passed-heading" className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">
            Passed
          </h2>
          <div className="space-y-4">
            {passed.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onStatus={onStatus(exam.id)} />
            ))}
          </div>
        </section>
      )}

      {abandoned.length > 0 && (
        <section aria-label="Abandoned exams">
          <button
            type="button"
            aria-expanded={showAbandoned}
            aria-controls="abandoned-exams"
            onClick={() => setShowAbandoned((value) => !value)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-sunken px-4 py-2.5 text-left text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Abandoned exams ({abandoned.length})
            <ChevronDown
              className={`size-4 transition-transform duration-150 ${showAbandoned ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {showAbandoned && (
            <div id="abandoned-exams" className="mt-3 animate-rise space-y-4">
              {abandoned.map((exam) => (
                <ExamCard key={exam.id} exam={exam} onStatus={onStatus(exam.id)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
