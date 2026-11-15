import { AnswerOption, answerState } from '@/components/AnswerOption'
import { Markdown } from '@/components/Markdown'
import { QuestionExplanation } from '@/components/QuestionExplanation'
import { Specimen } from '../kit'

const SHORT_EXPLANATION = 'Per-answer text says briefly why this option is right or wrong.'
export function Answers() {
  const states: {
    label: string
    state: ReturnType<typeof answerState>
    text: string
    explanation?: string
    shortcut?: number
  }[] = [
    { label: 'Default', state: 'idle', text: '`ArrayList` allows duplicates', shortcut: 1 },
    { label: 'Selected', state: 'selected', text: '`ArrayList` allows duplicates', shortcut: 1 },
    {
      label: 'Your answer, correct',
      state: 'correct-chosen',
      text: '`ArrayList` allows duplicates',
      explanation: SHORT_EXPLANATION,
    },
    {
      label: 'Correct answer you missed, or a reveal',
      state: 'correct-missed',
      text: '`ArrayList` allows duplicates',
      explanation: SHORT_EXPLANATION,
    },
    {
      label: 'Your answer, incorrect',
      state: 'wrong-chosen',
      text: '`HashSet` allows duplicates',
      explanation: SHORT_EXPLANATION,
    },
    {
      label: 'Other option, with text',
      state: 'neutral',
      text: '`TreeSet` allows duplicates',
      explanation: SHORT_EXPLANATION,
    },
    { label: 'Other option, no text', state: 'neutral', text: '`TreeSet` allows duplicates' },
    { label: 'Your answer, incorrect, no text', state: 'wrong-chosen', text: '`HashSet` allows duplicates' },
  ]

  return (
    <>
      {(['single', 'multi'] as const).map((kind) => (
        <div key={kind}>
          <h3 className="mb-3 text-sm">{kind === 'single' ? 'Single answer' : 'Multi-answer'}</h3>
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
            {states.map(({ label, state, text, explanation, shortcut }) => (
              <Specimen key={label} label={label}>
                <AnswerOption
                  kind={kind}
                  name={`gallery-${kind}-${label}`}
                  state={state}
                  shortcut={shortcut}
                  explanation={explanation}
                >
                  <Markdown>{text}</Markdown>
                </AnswerOption>
              </Specimen>
            ))}
          </div>
        </div>
      ))}
      <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        <Specimen label="Hover">
          <AnswerOption kind="single" name="gallery-hover" state="idle" shortcut={1} data-force="hover">
            <Markdown>`ArrayList` allows duplicates</Markdown>
          </AnswerOption>
        </Specimen>
        <Specimen label="Focus">
          <AnswerOption kind="single" name="gallery-focus" state="idle" shortcut={1} data-force="focus">
            <Markdown>`ArrayList` allows duplicates</Markdown>
          </AnswerOption>
        </Specimen>
        <Specimen label="Disabled while saving">
          <AnswerOption kind="single" name="gallery-disabled" state="selected" disabled>
            <Markdown>`ArrayList` allows duplicates</Markdown>
          </AnswerOption>
        </Specimen>
        <Specimen label="Long text and a code block">
          <AnswerOption kind="single" name="gallery-code" state="idle" shortcut={2}>
            <Markdown>{OPTION_WITH_CODE}</Markdown>
          </AnswerOption>
        </Specimen>
      </div>
      <Specimen label="Labelled as in the source, with its one explanation below">
        <div className="space-y-2">
          {LETTERED.map(({ label, text, state }) => (
            <AnswerOption key={label} kind="multi" name="gallery-lettered" state={state} label={label}>
              <Markdown>{text}</Markdown>
            </AnswerOption>
          ))}
          <AnswerOption kind="multi" name="gallery-lettered" state="neutral" label="D">
            <Markdown>{OPTION_WITH_CODE}</Markdown>
          </AnswerOption>
          <QuestionExplanation markdown={LETTERED_EXPLANATION} />
        </div>
      </Specimen>
    </>
  )
}

const LETTERED: { label: string; text: string; state: ReturnType<typeof answerState> }[] = [
  { label: 'A', text: '`Double[][]`', state: 'correct-chosen' },
  { label: 'B', text: '`Object`', state: 'neutral' },
  { label: 'C', text: '`Map`', state: 'wrong-chosen' },
]
const LETTERED_EXPLANATION =
  'A. A for-each loop supports arrays, making option A correct. A for-each also supports classes that implement `java.lang.Iterable`, which `Map` does not, so option C is incorrect. Option B does not implement it either.'

const OPTION_WITH_CODE = `It compiles, because the local variable is effectively final:

\`\`\`java
int count = 0;
Runnable task = () -> System.out.println(count);
\`\`\``
