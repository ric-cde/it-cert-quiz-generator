import { FlagButton } from '@/components/FlagControl'
import { QuizActions } from '@/components/QuizActions'
import { QuizProgress } from '@/components/QuizProgress'
import { useState } from 'react'
import { AnswerOption, answerState } from '@/components/AnswerOption'
import { Button } from '@/components/Button'
import { Kbd } from '@/components/Kbd'
import { Markdown } from '@/components/Markdown'
import { QuestionCard } from '@/components/QuestionCard'
import { Verdict, type VerdictKind } from '@/components/Verdict'
import type { QuizMark } from '@shared/quiz'

const DEMO_QUESTIONS = [
  {
    kind: 'single' as const,
    body: `What does this code print?

\`\`\`java
var list = new ArrayList<>(List.of(1, 2, 3));
list.remove(Integer.valueOf(1));
list.remove(1);
System.out.println(list);
\`\`\``,
    options: [
      {
        body: '`[2]`',
        correct: true,
        why: 'Correct! The first call removes the value 1, leaving `[2, 3]`. The second removes index 1, leaving `[2]`.',
      },
      {
        body: '`[3]`',
        correct: false,
        why: 'This would need the second call to remove index 0. An `int` argument is an index, so `remove(1)` removes the 3.',
      },
      {
        body: '`[2, 3]`',
        correct: false,
        why: 'This is the list after the first call only. `remove(1)` then removes the element at index 1.',
      },
      {
        body: '`[1, 3]`',
        correct: false,
        why: '`Integer.valueOf(1)` selects `remove(Object)`, so the value 1 is removed.',
      },
    ],
  },
  {
    kind: 'multi' as const,
    body: 'Which **two** statements about Java records are true? (Choose two.)',
    options: [
      {
        body: 'A record can implement interfaces.',
        correct: true,
        why: 'Correct! Records can implement any interface.',
      },
      {
        body: "A record's component fields are implicitly `final`.",
        correct: true,
        why: 'Correct! Records are shallowly immutable, so their fields are `private final`.',
      },
      {
        body: 'A record can extend another class.',
        correct: false,
        why: 'A record implicitly extends `java.lang.Record`, and Java only allows one superclass.',
      },
      {
        body: 'A record can declare extra instance fields.',
        correct: false,
        why: 'Only static fields are allowed in the body. Instance state comes from the components.',
      },
    ],
  },
]
export function TryIt() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [chosen, setChosen] = useState<number[]>([])
  const [outcome, setOutcome] = useState<'answering' | 'submitted' | 'revealed'>('answering')
  const [flagged, setFlagged] = useState(false)
  const [marks, setMarks] = useState<QuizMark[]>([])

  const question = DEMO_QUESTIONS[questionIndex]!
  const locked = outcome !== 'answering'

  function toggle(index: number) {
    if (question.kind === 'single') setChosen([index])
    else setChosen((current) => (current.includes(index) ? current.filter((x) => x !== index) : [...current, index]))
  }
  function next() {
    // The demo loops, so the marks start again with the first question.
    setMarks(questionIndex + 1 < DEMO_QUESTIONS.length ? [...marks, mark] : [])
    setQuestionIndex((index) => (index + 1) % DEMO_QUESTIONS.length)
    setChosen([])
    setOutcome('answering')
  }

  const isRight = question.options.every((option, index) => option.correct === chosen.includes(index))
  const verdict: VerdictKind = outcome === 'revealed' ? 'revealed' : isRight ? 'correct' : 'incorrect'
  const mark: QuizMark = verdict === 'correct' ? 'correct' : 'incorrect'

  return (
    <QuestionCard revealed={outcome === 'revealed'}>
      <div className="mb-4">
        <p className="mb-1.5 text-xs text-ink-soft">
          Question {questionIndex + 1} of {DEMO_QUESTIONS.length} · Sample
        </p>
        <QuizProgress
          position={questionIndex + (locked ? 1 : 0)}
          total={DEMO_QUESTIONS.length}
          current={questionIndex}
          marks={[...marks, ...(locked ? [mark] : [])]}
        />
      </div>

      <Markdown className="text-lg">{question.body}</Markdown>

      <div className="mt-5 space-y-2" key={questionIndex}>
        {question.options.map((option, index) => {
          const state = answerState({ chosen: chosen.includes(index), isCorrect: option.correct, locked })
          // After a reveal only the correct answer's text shows. After an answer, all of it does.
          const showText = outcome === 'submitted' || (outcome === 'revealed' && option.correct)
          return (
            <AnswerOption
              key={option.body}
              kind={question.kind}
              name={`try-it-${questionIndex}`}
              state={state}
              shortcut={index + 1}
              onToggle={() => toggle(index)}
              explanation={showText ? <Markdown>{option.why}</Markdown> : undefined}
            >
              <Markdown>{option.body}</Markdown>
            </AnswerOption>
          )
        })}
      </div>

      <QuizActions
        tools={<FlagButton flagged={flagged} onFlag={() => setFlagged(true)} onUnflag={() => setFlagged(false)} />}
        end={
          locked && (
            <Button variant="primary" onClick={next}>
              Next <Kbd tone="on-accent">Enter</Kbd>
            </Button>
          )
        }
      >
        {locked ? (
          <Verdict kind={verdict} />
        ) : (
          <>
            <Button variant="primary" disabled={chosen.length === 0} onClick={() => setOutcome('submitted')}>
              Submit {chosen.length > 0 && <Kbd tone="on-accent">Enter</Kbd>}
            </Button>
            <Button onClick={() => setOutcome('revealed')}>
              Reveal answer <Kbd>R</Kbd>
            </Button>
          </>
        )}
      </QuizActions>
    </QuestionCard>
  )
}
