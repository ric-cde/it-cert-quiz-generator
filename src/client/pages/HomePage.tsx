import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, FileUp, ListChecks, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/components/Button'
import { ExamCard } from '@/components/ExamCard'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import { useMe } from '@/lib/me'
import { formatStarted } from '@/lib/quiz-words'
import type { ExamStatus } from '@shared/home'
import { ErrorText, PageLoading } from '@/components/Notices'
import { Disclosure } from '@/components/Disclosure'
import { SectionLabel } from '@/components/SectionLabel'

/** Subjects, with their exams below them, each exam's sources with progress, and any unfinished quiz. */
export function HomePage() {
  const home = useQuery({ queryKey: ['home'], queryFn: async () => readJson(await api.api.home.$get()) })
  const { canEdit } = useMe()
  const queryClient = useQueryClient()
  const [showAbandoned, setShowAbandoned] = useState(false)

  const changeStatus = useMutation({
    mutationFn: async ({ examId, status }: { examId: number; status: ExamStatus }) =>
      readJson(await api.api.exams[':id'].status.$put({ param: { id: String(examId) }, json: { status } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  })
  const onStatus = (examId: number) => (status: ExamStatus) => changeStatus.mutate({ examId, status })

  if (home.isPending) return <PageLoading />
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
        <div className="flex flex-wrap gap-2">
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
          <Link to="/settings" className={buttonClass({ size: 'sm', variant: 'ghost' })}>
            <Settings className="size-4" aria-hidden="true" /> Settings
          </Link>
        </div>
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
          <SectionLabel id={`subject-${subject.id}`}>{subject.name}</SectionLabel>
          <div className="space-y-4">
            {subject.exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onStatus={onStatus(exam.id)} />
            ))}
          </div>
        </section>
      ))}

      {changeStatus.isError && <ErrorText>Couldn't change that exam: {changeStatus.error.message}</ErrorText>}

      {passed.length > 0 && (
        <section aria-labelledby="passed-heading">
          <SectionLabel id="passed-heading">Passed</SectionLabel>
          <div className="space-y-4">
            {passed.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onStatus={onStatus(exam.id)} />
            ))}
          </div>
        </section>
      )}

      {abandoned.length > 0 && (
        <section aria-label="Abandoned exams">
          <Disclosure
            summary={`Abandoned exams (${abandoned.length})`}
            open={showAbandoned}
            onToggle={() => setShowAbandoned((value) => !value)}
            contentClassName="space-y-4"
          >
            {abandoned.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onStatus={onStatus(exam.id)} />
            ))}
          </Disclosure>
        </section>
      )}
    </div>
  )
}
