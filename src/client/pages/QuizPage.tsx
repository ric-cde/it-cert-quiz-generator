import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AnswerOption, answerState } from '@/components/AnswerOption'
import { Button } from '@/components/Button'
import { FlagButton, FlagReason } from '@/components/FlagControl'
import { Kbd } from '@/components/Kbd'
import { Markdown } from '@/components/Markdown'
import { QuestionCard } from '@/components/QuestionCard'
import { NoExplanation, QuestionExplanation } from '@/components/QuestionExplanation'
import { QuizActions, rowButton } from '@/components/QuizActions'
import { QuizProgress } from '@/components/QuizProgress'
import { ReviewNotice } from '@/components/ReviewNotice'
import { Spinner } from '@/components/Spinner'
import { Verdict } from '@/components/Verdict'
import { api } from '@/lib/api'
import { HttpError, readJson } from '@/lib/http'
import { isForShortcuts } from '@/lib/shortcuts'
import type { QuizQuestion, QuizState } from '../../shared/quiz'
import { QuizResults } from './QuizResults'

const quizKey = (id: string) => ['quiz', id]

function QuestionView({ quizId, quiz, question }: { quizId: string; quiz: QuizState; question: QuizQuestion }) {
  const queryClient = useQueryClient()
  const [chosen, setChosen] = useState<number[]>([])
  const shownAt = useRef(performance.now())
  const top = useRef<HTMLDivElement>(null)

  const param = { id: quizId }
  const atEnd = quiz.feedback === 'at_end'
  const multi = question.type === 'multi'
  const { outcome } = question
  const locked = outcome !== null
  const revealed = outcome?.kind === 'revealed'
  const flagged = question.flag !== null
  const hasText = Boolean(question.explanationMd) || question.options.some((option) => option.explanationMd)

  // Keyboard and screen reader users start each question at its top.
  useEffect(() => top.current?.focus(), [])

  const act = useMutation({
    mutationFn: async (call: () => Promise<QuizState>) => call(),
    onSuccess: (state) => queryClient.setQueryData(quizKey(quizId), state),
    onError: (error) => {
      // Out of date, perhaps from another tab. The server's state is the right one to show.
      if (error instanceof HttpError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: quizKey(quizId) })
      }
    },
  })

  const flagging = useMutation({
    mutationFn: async (change: { flag: true; reason?: string } | { flag: false }) => {
      const flagParam = { id: String(question.id) }
      return change.flag
        ? readJson(
            await api.api.questions[':id'].flag.$put({
              param: flagParam,
              json: change.reason === undefined ? {} : { reason: change.reason },
            }),
          )
        : readJson(await api.api.questions[':id'].flag.$delete({ param: flagParam }))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKey(quizId) }),
  })

  const elapsed = () => Math.round(performance.now() - shownAt.current)
  const busy = act.isPending

  function toggle(id: number) {
    if (multi) setChosen((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]))
    else setChosen([id])
  }
  function submit() {
    act.mutate(async () =>
      readJson(
        await api.api.quizzes[':id'].answer.$post({
          param,
          json: { questionId: question.id, selectedOptionIds: chosen, durationMs: elapsed() },
        }),
      ),
    )
  }
  function reveal() {
    act.mutate(async () =>
      readJson(await api.api.quizzes[':id'].reveal.$post({ param, json: { questionId: question.id, durationMs: elapsed() } })),
    )
  }
  function moveOn() {
    act.mutate(async () => readJson(await api.api.quizzes[':id'].next.$post({ param, json: { questionId: question.id } })))
  }

  /** What Next does at the end of a question: an at-the-end answer is saved as it moves on. */
  function nextAtEnd() {
    if (chosen.length > 0) submit()
    else moveOn()
  }

  // Read fresh on every key press, so the handler never sees an old selection.
  const onKey = useRef<(event: KeyboardEvent) => void>(() => {})
  onKey.current = (event) => {
    if (!isForShortcuts(event) || busy) return
    const key = event.key.toLowerCase()

    if (key >= '1' && key <= '9' && key.length === 1 && !locked) {
      const option = question.options[Number(key) - 1]
      if (option) {
        event.preventDefault()
        toggle(option.id)
      }
    } else if (key === 'enter') {
      event.preventDefault()
      if (atEnd) nextAtEnd()
      else if (locked) moveOn()
      else if (chosen.length > 0) submit()
      else if (flagged) moveOn()
    } else if (key === 'r' && !atEnd && !locked) {
      event.preventDefault()
      reveal()
    }
  }
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <QuestionCard revealed={revealed}>
      <div ref={top} tabIndex={-1} className="mb-4 outline-none">
        <p className="mb-1.5 text-xs break-words text-ink-soft">
          Question {quiz.position + 1} of {quiz.total} · {question.source}
          {question.category && ` · ${question.category}`}
        </p>
        <QuizProgress position={quiz.position + (locked ? 1 : 0)} total={quiz.total} current={quiz.position} />
      </div>

      {question.inDoubt && (
        <div className="mb-4">
          <ReviewNotice note={question.reviewNote ?? ''} answered={locked} />
        </div>
      )}

      <Markdown className="text-lg">{question.bodyMd}</Markdown>

      <div className="mt-5 space-y-2">
        {question.options.map((option, index) => {
          const picked = locked ? outcome.selectedOptionIds.includes(option.id) : chosen.includes(option.id)
          return (
            <AnswerOption
              key={option.id}
              kind={multi ? 'multi' : 'single'}
              name={`question-${question.id}`}
              state={answerState({ chosen: picked, isCorrect: option.isCorrect ?? false, locked })}
              shortcut={index < 9 ? index + 1 : undefined}
              disabled={busy}
              onToggle={() => toggle(option.id)}
              explanation={option.explanationMd ? <Markdown>{option.explanationMd}</Markdown> : undefined}
            >
              <Markdown>{option.bodyMd}</Markdown>
            </AnswerOption>
          )
        })}
      </div>

      {locked && question.explanationMd && <QuestionExplanation markdown={question.explanationMd} />}
      {locked && outcome.result === 'incorrect' && !hasText && <NoExplanation />}

      {act.isError && !(act.error instanceof HttpError && act.error.status === 409) && (
        <p role="alert" className="mt-4 text-sm font-semibold text-wrong-ink">
          Couldn't save that, so please try again: {act.error.message}
        </p>
      )}

      <QuizActions
        tools={
          <FlagButton
            flagged={flagged}
            busy={flagging.isPending}
            onFlag={() => flagging.mutate({ flag: true })}
            onUnflag={() => flagging.mutate({ flag: false })}
          />
        }
        end={
          atEnd || locked ? (
            <Button variant="primary" className={rowButton} loading={busy} onClick={atEnd ? nextAtEnd : moveOn}>
              Next <Kbd tone="on-accent">Enter</Kbd>
            </Button>
          ) : (
            flagged && (
              <Button variant="ghost" className={rowButton} disabled={busy} title="Move on without answering. No attempt is logged." onClick={moveOn}>
                Skip
              </Button>
            )
          )
        }
      >
        {atEnd && chosen.length === 0 && <p className="text-sm text-ink-soft">Nothing selected, so Next skips this one.</p>}
        {!atEnd && locked && <Verdict kind={revealed ? 'revealed' : outcome.result} />}
        {!atEnd && !locked && (
          <>
            <Button variant="primary" className={rowButton} disabled={chosen.length === 0} loading={busy} onClick={submit}>
              Submit {chosen.length > 0 && <Kbd tone="on-accent">Enter</Kbd>}
            </Button>
            <Button className={rowButton} aria-label="Reveal answer" disabled={busy} onClick={reveal}>
              Reveal<span className="max-sm:hidden"> answer</span> <Kbd>R</Kbd>
            </Button>
          </>
        )}
      </QuizActions>

      {flagged && (
        <div className="mt-3">
          <FlagReason
            reason={question.flag?.reason ?? null}
            busy={flagging.isPending}
            onSaveReason={(reason) => flagging.mutate({ flag: true, reason })}
          />
        </div>
      )}
    </QuestionCard>
  )
}

function EndQuiz({ quizId }: { quizId: string }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const end = useMutation({
    mutationFn: async () => readJson(await api.api.quizzes[':id'].finish.$post({ param: { id: quizId } })),
    onSuccess: (state) => queryClient.setQueryData(quizKey(quizId), state),
  })

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        End quiz
      </Button>
    )
  }
  return (
    <span className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {end.isError ? (
        <span role="alert" className="font-semibold text-wrong-ink">
          Couldn't end it: {end.error.message}
        </span>
      ) : (
        'End it now? Your answers are kept.'
      )}
      <Button size="sm" loading={end.isPending} onClick={() => end.mutate()}>
        Yes, end it
      </Button>
      <Button size="sm" variant="ghost" autoFocus disabled={end.isPending} onClick={() => setConfirming(false)}>
        Keep going
      </Button>
    </span>
  )
}

export function QuizPage() {
  const { id = '' } = useParams()

  const quiz = useQuery({
    queryKey: quizKey(id),
    queryFn: async () => readJson(await api.api.quizzes[':id'].$get({ param: { id } })),
    // This screen changes only when you act on it, and a refetch mid-answer would be wasted.
    refetchOnWindowFocus: false,
  })

  if (quiz.isPending) {
    return (
      <p className="mx-auto max-w-2xl">
        <Spinner />
      </p>
    )
  }
  if (quiz.isError) {
    const missing = quiz.error instanceof HttpError && quiz.error.status < 500
    return (
      <div role="alert" className="mx-auto max-w-2xl">
        <p className="font-semibold text-wrong-ink">
          {missing ? "There's no such quiz." : `Couldn't load this quiz: ${quiz.error.message}`}
        </p>
        <p className="mt-2 text-sm">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    )
  }

  const state: QuizState = quiz.data
  if (state.finished || !state.current) return <QuizResults quiz={state} />

  return (
    <div>
      <div className="mx-auto mb-3 flex max-w-2xl flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 text-sm font-semibold break-words text-ink-soft">{state.exam}</h1>
        <EndQuiz quizId={id} />
      </div>
      {/* A new question starts clean: no selection, a fresh timer and focus back at the top. */}
      <QuestionView key={state.current.id} quizId={id} quiz={state} question={state.current} />
    </div>
  )
}
