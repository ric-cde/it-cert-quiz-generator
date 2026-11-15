import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { AnswerOption, answerState } from '@/components/AnswerOption'
import { Button } from '@/components/Button'
import { CopyButton } from '@/components/CopyButton'
import { DifficultyControl, MAX_DIFFICULTY, MIN_DIFFICULTY } from '@/components/DifficultyControl'
import { FlagButton, FlagReason } from '@/components/FlagControl'
import { Kbd } from '@/components/Kbd'
import { Markdown } from '@/components/Markdown'
import { QuestionCard } from '@/components/QuestionCard'
import { NoExplanation, QuestionExplanation } from '@/components/QuestionExplanation'
import { QuizActions, rowButton } from '@/components/QuizActions'
import { QuizProgress } from '@/components/QuizProgress'
import { ReviewNotice } from '@/components/ReviewNotice'
import { StarButton } from '@/components/StarButton'
import { ErrorText, PageError, PageLoading } from '@/components/Notices'
import { Verdict } from '@/components/Verdict'
import { api } from '@/lib/api'
import { useFeature } from '@/lib/features'
import { HttpError, readJson } from '@/lib/http'
import { questionAsText } from '@/lib/question-text'
import { useShortcuts } from '@/lib/shortcuts'
import type { QuizQuestion, QuizState } from '@shared/quiz'
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

  /** What's on screen, to paste into an LLM. Answers and explanations only once they show. */
  function questionText() {
    return questionAsText({
      bodyMd: question.bodyMd,
      multi,
      options: question.options.map((option) => {
        const picked = locked ? outcome.selectedOptionIds.includes(option.id) : chosen.includes(option.id)
        return {
          label: option.label,
          bodyMd: option.bodyMd,
          explanationMd: option.explanationMd,
          state: answerState({ chosen: picked, isCorrect: option.isCorrect ?? false, locked }),
        }
      }),
      verdict: locked ? (revealed ? 'revealed' : outcome.result) : null,
      explanationMd: question.explanationMd,
    })
  }

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

  const canStar = useFeature('starredQuestions')
  const starring = useMutation({
    mutationFn: async (starred: boolean) => {
      const star = api.api.questions[':id'].star
      const starParam = { param: { id: String(question.id) } }
      await readJson(await (starred ? star.$put(starParam) : star.$delete(starParam)))
      return starred
    },
    // Only the star changes, so there's no need to load the question again.
    onSuccess: (starred) =>
      queryClient.setQueryData<QuizState>(quizKey(quizId), (state) =>
        state?.current?.id === question.id ? { ...state, current: { ...state.current, starred } } : state,
      ),
  })
  // The star fills as soon as it's pressed, and goes back if saving fails.
  const starred = starring.isPending ? starring.variables : question.starred

  // Experimental: your difficulty for a locked question, with a step up or down.
  const canAdjust = useFeature('difficultyButtons')
  const difficulty = canAdjust && !atEnd && locked ? (question.difficulty ?? null) : null
  const adjusting = useMutation({
    mutationFn: async (change: 1 | -1) =>
      readJson(
        await api.api.questions[':id'].difficulty.$post({ param: { id: String(question.id) }, json: { change } }),
      ),
    // Only the difficulty changes, so there's no need to load the question again.
    onSuccess: (result) =>
      queryClient.setQueryData<QuizState>(quizKey(quizId), (state) =>
        state?.current?.id === question.id
          ? { ...state, current: { ...state.current, difficulty: result.difficulty } }
          : state,
      ),
  })
  function adjust(change: 1 | -1) {
    if (difficulty === null || adjusting.isPending) return
    const next = difficulty + change
    if (next >= MIN_DIFFICULTY && next <= MAX_DIFFICULTY) adjusting.mutate(change)
  }

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
      readJson(
        await api.api.quizzes[':id'].reveal.$post({ param, json: { questionId: question.id, durationMs: elapsed() } }),
      ),
    )
  }
  function moveOn() {
    act.mutate(async () =>
      readJson(await api.api.quizzes[':id'].next.$post({ param, json: { questionId: question.id } })),
    )
  }

  /** What Next does at the end of a question: an at-the-end answer is saved as it moves on. */
  function nextAtEnd() {
    if (chosen.length > 0) submit()
    else moveOn()
  }

  useShortcuts((event, key) => {
    if (busy) return
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
    } else if ((key === 'arrowup' || key === 'arrowdown') && difficulty !== null) {
      event.preventDefault()
      adjust(key === 'arrowup' ? 1 : -1)
    }
  })

  return (
    <QuestionCard revealed={revealed} fullWidthOnPhone>
      <div ref={top} tabIndex={-1} className="mb-4 outline-none">
        <p className="mb-1.5 text-xs break-words text-ink-soft">
          Question {quiz.position + 1} of {quiz.total} · {question.source}
          {question.category && ` · ${question.category}`}
        </p>
        <QuizProgress
          position={quiz.position + (locked ? 1 : 0)}
          total={quiz.total}
          current={quiz.position}
          marks={quiz.marks}
        />
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
              label={option.label}
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

      {starring.isError && <ErrorText className="mt-4">Couldn't save that star: {starring.error.message}</ErrorText>}
      {adjusting.isError && (
        <ErrorText className="mt-4">Couldn't change the difficulty: {adjusting.error.message}</ErrorText>
      )}
      {act.isError && !(act.error instanceof HttpError && act.error.status === 409) && (
        <ErrorText className="mt-4">Couldn't save that, so please try again: {act.error.message}</ErrorText>
      )}

      <QuizActions
        pinned
        tools={
          <>
            <CopyButton
              label="Copy question"
              title="Copy the question and its options, to paste into an LLM. Once answered, your answer and the explanations come too."
              text={questionText}
            />
            {difficulty !== null && (
              <DifficultyControl difficulty={difficulty} busy={adjusting.isPending} onChange={adjust} />
            )}
            {canStar && (
              <StarButton
                on={starred}
                label="Star this question"
                title={starred ? 'Starred. Press to take the star off.' : 'Star this question, to find it again later'}
                onChange={(next) => starring.mutate(next)}
              />
            )}
            <FlagButton
              flagged={flagged}
              busy={flagging.isPending}
              onFlag={() => flagging.mutate({ flag: true })}
              onUnflag={() => flagging.mutate({ flag: false })}
            />
          </>
        }
        end={
          atEnd || locked ? (
            <Button variant="primary" className={rowButton} loading={busy} onClick={atEnd ? nextAtEnd : moveOn}>
              Next <Kbd tone="on-accent">Enter</Kbd>
            </Button>
          ) : (
            flagged && (
              <Button
                variant="ghost"
                className={rowButton}
                disabled={busy}
                title="Move on without answering. No attempt is logged."
                onClick={moveOn}
              >
                Skip
              </Button>
            )
          )
        }
      >
        {atEnd && chosen.length === 0 && (
          <p className="text-sm text-ink-soft">Nothing selected, so Next skips this one.</p>
        )}
        {!atEnd && locked && <Verdict kind={revealed ? 'revealed' : outcome.result} />}
        {!atEnd && !locked && (
          <>
            <Button
              variant="primary"
              className={rowButton}
              disabled={chosen.length === 0}
              loading={busy}
              onClick={submit}
            >
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
      <Button size="sm" variant="ghost" className="flex-none" onClick={() => setConfirming(true)}>
        Exit
      </Button>
    )
  }
  return (
    // On a phone, the question takes a line of its own below the exam's name.
    <span className="flex flex-wrap items-center justify-end gap-2 text-sm max-sm:basis-full">
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

  if (quiz.isPending) return <PageLoading className="mx-auto max-w-2xl" />
  if (quiz.isError) {
    const missing = quiz.error instanceof HttpError && quiz.error.status < 500
    return (
      <PageError className="mx-auto max-w-2xl">
        {missing ? "There's no such quiz." : `Couldn't load this quiz: ${quiz.error.message}`}
      </PageError>
    )
  }

  const state: QuizState = quiz.data
  if (state.finished || !state.current) return <QuizResults quiz={state} />

  return (
    <div>
      {/* Exit stays at the top right, beside the exam's name, which wraps if it must. */}
      <div className="mx-auto mb-3 flex max-w-2xl flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h1 className="min-w-0 flex-1 pt-1 text-sm font-semibold break-words text-ink-soft">{state.exam}</h1>
        <EndQuiz quizId={id} />
      </div>
      {/* A new question starts clean: no selection, a fresh timer and focus back at the top. */}
      <QuestionView key={state.current.id} quizId={id} quiz={state} question={state.current} />
    </div>
  )
}
