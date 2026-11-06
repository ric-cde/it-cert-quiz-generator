import { FlagButton, FlagReason } from '@/components/FlagControl'
import { QuizActions } from '@/components/QuizActions'
import { QuizProgress } from '@/components/QuizProgress'
import { QuizScore } from '@/components/QuizScore'
import { NoExplanation, QuestionExplanation } from '@/components/QuestionExplanation'
import { Copy, Flag, Pencil, Sparkles } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { AnswerOption, answerState } from '@/components/AnswerOption'
import { ChapterPreview, IssueList, QuestionPreview, TrustTag } from '@/components/BankPreview'
import { Button, type ButtonVariant } from '@/components/Button'
import { CategoryList } from '@/components/CategoryList'
import { CodeBlock } from '@/components/CodeBlock'
import { DataTable } from '@/components/DataTable'
import { TextArea, TextField } from '@/components/Field'
import { FileDrop } from '@/components/FileDrop'
import { FilterField, FilterPanel, LiveCount, type MaxQuestions, MaxQuestionsPicker, Segmented, Switch } from '@/components/Filters'
import { Kbd } from '@/components/Kbd'
import { Markdown } from '@/components/Markdown'
import { ProgressBar } from '@/components/ProgressBar'
import { QuestionCard } from '@/components/QuestionCard'
import { Spinner } from '@/components/Spinner'
import { ReviewNotice } from '@/components/ReviewNotice'
import { RandomTile, SourceTile, Tile, TileGrid } from '@/components/Tile'
import { ExamCard } from '@/components/ExamCard'
import { CategoryBreakdown, ReviewEntryCard } from '@/components/QuizReview'
import { Verdict, type VerdictKind } from '@/components/Verdict'
import type { CategoryChoice, ExamCategory, PlannedQuestion } from '../../shared/import'
import type { InspectorRow, SortDir } from '../../shared/inspector'

const SECTIONS = [
  ['try-it', 'Try it'],
  ['colours', 'Colours'],
  ['type', 'Type'],
  ['shape', 'Spacing and shape'],
  ['buttons', 'Buttons'],
  ['keycaps', 'Keycaps'],
  ['progress', 'Progress bars'],
  ['tiles', 'Tiles'],
  ['answers', 'Answer options'],
  ['quiz', 'Taking a quiz'],
  ['home', 'Home'],
  ['results', 'Results'],
  ['verdicts', 'Verdicts'],
  ['code', 'Code blocks'],
  ['markdown', 'Markdown'],
  ['filters', 'Filters'],
  ['fields', 'Text fields'],
  ['data-tables', 'Data tables'],
  ['importing', 'Importing'],
] as const

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-xl">{title}</h2>
      {intro && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{intro}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  )
}

/** One labelled state of a component. */
function Specimen({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <p className="mb-2 text-xs font-semibold text-ink-soft">{label}</p>
      {children}
    </div>
  )
}

function SpecimenGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-5 gap-y-6">{children}</div>
}

/* ---------- Tokens ---------- */

const COLOUR_GROUPS: { name: string; tokens: string[] }[] = [
  { name: 'Paper', tokens: ['paper', 'surface', 'sunken', 'line', 'line-strong'] },
  { name: 'Ink', tokens: ['ink', 'ink-soft'] },
  { name: 'Accent: what you are doing', tokens: ['accent', 'accent-strong', 'accent-soft', 'on-accent'] },
  { name: 'Correct', tokens: ['correct', 'correct-ink', 'correct-soft'] },
  { name: 'Incorrect', tokens: ['wrong', 'wrong-ink', 'wrong-soft'] },
  { name: 'Attempted, not yet right', tokens: ['amber', 'amber-ink', 'amber-soft'] },
  { name: 'Code', tokens: ['code-bg', 'code-ink', 'code-soft', 'code-comment', 'code-string', 'code-constant', 'code-keyword', 'code-operator', 'code-function', 'code-type'] },
]

function Colours() {
  return (
    <div className="space-y-5">
      {COLOUR_GROUPS.map((group) => (
        <div key={group.name}>
          <p className="mb-2 text-sm font-semibold">{group.name}</p>
          <div className="flex flex-wrap gap-3">
            {group.tokens.map((token) => (
              <div key={token} className="w-24">
                <div
                  className="h-12 rounded-md border border-line"
                  style={{ background: `var(--color-${token})` }}
                />
                <p className="mt-1 font-mono text-xs break-words text-ink-soft">{token}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TYPE_SCALE = [
  ['text-2xl', 'Page title', 'text-2xl font-bold'],
  ['text-xl', 'Section heading', 'text-xl font-bold'],
  ['text-lg', 'Question text', 'text-lg'],
  ['text-base', 'Body and answer text', 'text-base'],
  ['text-sm', 'Per-answer text and controls', 'text-sm'],
  ['text-xs', 'Labels and counts', 'text-xs'],
] as const

function TypeScale() {
  return (
    <div className="space-y-3">
      {TYPE_SCALE.map(([token, sample, className]) => (
        <div key={token} className="flex flex-wrap items-baseline gap-x-4">
          <span className="w-20 flex-none font-mono text-xs text-ink-soft">{token}</span>
          <span className={className}>{sample}</span>
        </div>
      ))}
      <div className="flex flex-wrap items-baseline gap-x-4">
        <span className="w-20 flex-none font-mono text-xs text-ink-soft">font-mono</span>
        <span className="font-mono text-sm">List&lt;Integer&gt; list = new ArrayList&lt;&gt;();</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4">
        <span className="w-20 flex-none font-mono text-xs text-ink-soft">legibility</span>
        <span className="text-lg">
          Il1 O0 rn m · <span className="font-mono">Il1 O0 rn m</span>
        </span>
      </div>
    </div>
  )
}

function Shape() {
  return (
    <div className="flex flex-wrap gap-8">
      <Specimen label="Spacing (multiples of 4px)">
        <div className="flex items-end gap-2">
          {[1, 2, 3, 4, 6, 8, 12].map((step) => (
            <div key={step} className="text-center">
              <div className="bg-accent" style={{ width: `${step * 4}px`, height: `${step * 4}px` }} />
              <p className="mt-1 text-xs text-ink-soft">{step * 4}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen label="Radii">
        <div className="flex gap-3">
          {['sm', 'md', 'lg', 'full'].map((radius) => (
            <div key={radius} className="text-center">
              <div
                className="size-12 border-[1.5px] border-accent bg-accent-soft"
                style={{ borderRadius: `var(--radius-${radius})` }}
              />
              <p className="mt-1 font-mono text-xs text-ink-soft">{radius}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen label="Shadows">
        <div className="flex gap-4">
          {['card', 'raised'].map((shadow) => (
            <div key={shadow} className="text-center">
              <div
                className="size-12 rounded-md bg-surface"
                style={{ boxShadow: `var(--shadow-${shadow})` }}
              />
              <p className="mt-1 font-mono text-xs text-ink-soft">{shadow}</p>
            </div>
          ))}
        </div>
      </Specimen>
    </div>
  )
}

/* ---------- Components ---------- */

const BUTTON_VARIANTS: { variant: ButtonVariant; label: string }[] = [
  { variant: 'primary', label: 'Primary' },
  { variant: 'secondary', label: 'Secondary' },
  { variant: 'ghost', label: 'Ghost' },
  { variant: 'danger', label: 'Danger' },
]

function Buttons() {
  return (
    <>
      <div className="overflow-x-auto">
        <div className="grid w-max grid-cols-[6rem_repeat(5,auto)] items-center gap-x-4 gap-y-3 text-xs font-semibold text-ink-soft">
          <span />
          <span>Default</span>
          <span>Hover</span>
          <span>Focus</span>
          <span>Disabled</span>
          <span>Loading</span>
          {BUTTON_VARIANTS.flatMap(({ variant, label }) => [
            <span key={`${variant}-label`}>{label}</span>,
            <Button key={`${variant}-default`} variant={variant}>
              Submit
            </Button>,
            <Button key={`${variant}-hover`} variant={variant} data-force="hover">
              Submit
            </Button>,
            <Button key={`${variant}-focus`} variant={variant} data-force="focus">
              Submit
            </Button>,
            <Button key={`${variant}-disabled`} variant={variant} disabled>
              Submit
            </Button>,
            <Button key={`${variant}-loading`} variant={variant} loading>
              Judging
            </Button>,
          ])}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <Specimen label="Small">
          <div className="flex gap-2">
            <Button size="sm" variant="primary">
              Next
            </Button>
            <Button size="sm">Retry missed</Button>
            <Button size="sm" variant="ghost">
              <Flag className="size-4" aria-hidden="true" /> Flag
            </Button>
          </div>
        </Specimen>
        <Specimen label="With a keyboard shortcut">
          <div className="flex gap-2">
            <Button variant="primary">
              Submit <Kbd tone="on-accent">Enter</Kbd>
            </Button>
            <Button>
              Reveal answer <Kbd>R</Kbd>
            </Button>
          </div>
        </Specimen>
        <Specimen label="Icon only">
          <div className="flex gap-2">
            <Button iconOnly aria-label="Edit question">
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button iconOnly size="sm" variant="ghost" aria-label="Copy">
              <Copy className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </Specimen>
        <Specimen label="Claude action (always a deliberate press)">
          <Button>
            <Sparkles className="size-4" aria-hidden="true" /> Generate explanation
          </Button>
        </Specimen>
      </div>
    </>
  )
}

function Progress() {
  const bars: [string, number, number, number][] = [
    ['Never attempted', 0, 0, 80],
    ['Some correct', 24, 0, 80],
    ['Correct and attempted', 38, 17, 80],
    ['Only attempted, none right', 0, 30, 80],
    ['Attempted everything', 52, 28, 80],
    ['Complete', 80, 0, 80],
    ['199 of 200 reads 99%, not 100%', 199, 1, 200],
    ['No questions yet', 0, 0, 0],
  ]
  return (
    <SpecimenGrid>
      {bars.map(([label, correct, incorrect, total]) => (
        <Specimen key={label} label={label}>
          <ProgressBar label={label} correct={correct} incorrect={incorrect} total={total} />
        </Specimen>
      ))}
      <Specimen label="Muted (while Random is selected)">
        <ProgressBar label="Muted" correct={38} incorrect={17} total={80} muted />
      </Specimen>
      <Specimen label="Status Unanswered: the grey part stands out">
        <ProgressBar label="Unanswered picked" correct={38} incorrect={17} total={80} emphasis="unanswered" />
      </Specimen>
      <Specimen label="Status Incorrect or Unsolved: the yellow part stands out">
        <ProgressBar label="Incorrect picked" correct={38} incorrect={17} total={80} emphasis="incorrect" />
      </Specimen>
      <Specimen label="Without the figure">
        <ProgressBar label="No figure" correct={38} incorrect={17} total={80} showPercent={false} />
      </Specimen>
    </SpecimenGrid>
  )
}

function InteractiveTiles() {
  const [random, setRandom] = useState(false)
  const [picked, setPicked] = useState<string[]>(['oop', 'boyarsky'])
  const [expanded, setExpanded] = useState(true)

  function toggle(id: string) {
    setRandom(false)
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }
  const tile = (
    id: string,
    title: string,
    correct: number,
    incorrect: number,
    total: number,
    origin?: 'official' | 'unofficial',
  ) => (
    <Tile
      key={id}
      title={title}
      origin={origin}
      count={total}
      progress={{ correct, incorrect, total }}
      selected={!random && picked.includes(id)}
      diminished={random}
      onClick={() => toggle(id)}
    />
  )

  return (
    <div className="space-y-4">
      <RandomTile
        selected={random}
        onClick={() => {
          setRandom((value) => !value)
          setPicked([])
        }}
      />
      <div>
        <h3 className={`mb-2 text-sm ${random ? 'text-ink-soft' : ''}`}>Categories</h3>
        <TileGrid>
          {tile('oop', 'Object-Oriented Programming', 18, 7, 42, 'official')}
          {tile('streams', 'Streams and Lambdas', 5, 9, 36, 'official')}
          {tile('concurrency', 'Concurrency', 0, 0, 24, 'official')}
          {tile('modules', 'Modules from an imported file', 12, 0, 12, 'unofficial')}
        </TileGrid>
      </div>
      <div>
        <h3 className={`mb-2 text-sm ${random ? 'text-ink-soft' : ''}`}>Sources</h3>
        <TileGrid>
          <SourceTile
            title="OCP Study Guide (Boyarsky)"
            count={120}
            progress={{ correct: 40, incorrect: 22, total: 120 }}
            chapterCount={3}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((value) => !value)}
            chapterHint={
              !random && picked.includes('boyarsky')
                ? 'All chapters are included. Pick some to narrow further.'
                : undefined
            }
            selected={!random && picked.includes('boyarsky')}
            diminished={random}
            onClick={() => toggle('boyarsky')}
          >
            {tile('ch1', 'Chapter 1: Building Blocks', 14, 3, 20)}
            {tile('ch2', 'Chapter 2: Operators', 6, 4, 20)}
            {tile('ch3', 'Chapter 3: Making Decisions', 0, 0, 20)}
          </SourceTile>
          <SourceTile
            title="Enthuware Practice Sets"
            count={200}
            progress={{ correct: 12, incorrect: 8, total: 200 }}
            chapterCount={4}
            expanded={false}
            selected={!random && picked.includes('enthuware')}
            diminished={random}
            onClick={() => toggle('enthuware')}
          />
        </TileGrid>
      </div>
    </div>
  )
}

function Tiles() {
  const progress = { correct: 18, incorrect: 7, total: 42 }
  const none = { correct: 0, incorrect: 0, total: 0 }
  return (
    <>
      <Specimen label="Working example: click tiles, chapters and Random">
        <InteractiveTiles />
      </Specimen>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-x-3 gap-y-5">
        <Specimen label="Default">
          <Tile title="Concurrency" count={42} progress={progress} />
        </Specimen>
        <Specimen label="Hover">
          <Tile title="Concurrency" count={42} progress={progress} data-force="hover" />
        </Specimen>
        <Specimen label="Focus">
          <Tile title="Concurrency" count={42} progress={progress} data-force="focus" />
        </Specimen>
        <Specimen label="Selected">
          <Tile title="Concurrency" count={42} progress={progress} selected />
        </Specimen>
        <Specimen label="Included by another pick">
          <Tile title="Concurrency" count={42} progress={progress} included />
        </Specimen>
        <Specimen label="Diminished (Random is on)">
          <Tile title="Concurrency" count={42} progress={progress} diminished />
        </Specimen>
        <Specimen label="No questions">
          <Tile title="Concurrency" count={0} progress={none} empty />
        </Specimen>
      </div>
    </>
  )
}

const SHORT_EXPLANATION = 'Per-answer text says briefly why this option is right or wrong.'

function Answers() {
  const states: { label: string; state: ReturnType<typeof answerState>; text: string; explanation?: string; shortcut?: number }[] = [
    { label: 'Default', state: 'idle', text: '`ArrayList` allows duplicates', shortcut: 1 },
    { label: 'Selected', state: 'selected', text: '`ArrayList` allows duplicates', shortcut: 1 },
    { label: 'Your answer, correct', state: 'correct-chosen', text: '`ArrayList` allows duplicates', explanation: SHORT_EXPLANATION },
    { label: 'Correct answer you missed, or a reveal', state: 'correct-missed', text: '`ArrayList` allows duplicates', explanation: SHORT_EXPLANATION },
    { label: 'Your answer, incorrect', state: 'wrong-chosen', text: '`HashSet` allows duplicates', explanation: SHORT_EXPLANATION },
    { label: 'Other option, with text', state: 'neutral', text: '`TreeSet` allows duplicates', explanation: SHORT_EXPLANATION },
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
    </>
  )
}

const OPTION_WITH_CODE = `It compiles, because the local variable is effectively final:

\`\`\`java
int count = 0;
Runnable task = () -> System.out.println(count);
\`\`\``

const VERDICTS: VerdictKind[] = ['correct', 'partial', 'incorrect', 'revealed', 'skipped', 'pending']

const JAVA_SAMPLE = `public record Point(int x, int y) {
    // Compact constructor: validates before the fields are assigned
    public Point {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("Negative: " + x + ", " + y);
        }
    }

    static Point origin() { return new Point(0, 0); }
}`

const LONG_LINE = `var message = Stream.of("a", "very", "long", "line", "that", "keeps", "going", "well", "past", "the", "edge", "of", "the", "block").collect(Collectors.joining(" "));`

function CodeBlocks() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Specimen label="Java" className="md:col-span-2">
        <CodeBlock code={JAVA_SAMPLE} language="java" />
      </Specimen>
      <Specimen label="Long lines scroll">
        <CodeBlock code={LONG_LINE} language="java" />
      </Specimen>
      <Specimen label="No language given">
        <CodeBlock code={'Exception in thread "main"\njava.lang.NullPointerException'} />
      </Specimen>
      <Specimen label="TypeScript">
        <CodeBlock code={'const total: number = items.reduce((sum, x) => sum + x.price, 0)'} language="ts" />
      </Specimen>
      <Specimen label="SQL">
        <CodeBlock code={"SELECT name FROM users WHERE role = 'admin' -- OutSystems aggregates"} language="sql" />
      </Specimen>
    </div>
  )
}

const MARKDOWN_SAMPLE = `Which **two** statements about \`sealed\` classes are true?

- A permitted subclass must be \`final\`, \`sealed\` or \`non-sealed\`
- See the [Java Language Specification](https://docs.oracle.com/javase/specs/)

| Modifier | Can be extended? |
|---|---|
| \`final\` | No |
| \`non-sealed\` | Yes |

> Raw HTML in a question is dropped, so this is safe: <script>alert('nope')</script>
`

/* ---------- Filters ---------- */

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'unsolved', label: 'Unsolved' },
] as const
const TYPE = [
  { value: 'all', label: 'All' },
  { value: 'mc', label: 'Multiple choice' },
  { value: 'free', label: 'Free-form' },
] as const
const SORT = [
  { value: 'random', label: 'Random' },
  { value: 'easiest', label: 'Easiest 1st' },
  { value: 'hardest', label: 'Hardest 1st' },
] as const
const FEEDBACK = [
  { value: 'each', label: 'After each question' },
  { value: 'end', label: 'At the end' },
] as const

function Filters() {
  const [status, setStatus] = useState<(typeof STATUS)[number]['value']>('all')
  const [type, setType] = useState<(typeof TYPE)[number]['value']>('all')
  const [sort, setSort] = useState<(typeof SORT)[number]['value']>('random')
  const [feedback, setFeedback] = useState<(typeof FEEDBACK)[number]['value']>('each')
  const [max, setMax] = useState<MaxQuestions>(20)
  const [prioritise, setPrioritise] = useState(true)

  const available = 137
  const selected = max === 'max' ? available : Math.min(max, available)

  return (
    <>
      <Specimen label="Working example, with sample numbers">
        <FilterPanel footer={<LiveCount selected={selected} available={available} />}>
          <FilterField label="Status">
            <Segmented label="Status" value={status} options={STATUS} onChange={setStatus} />
          </FilterField>
          <FilterField label="Type">
            <Segmented label="Type" value={type} options={TYPE} onChange={setType} />
          </FilterField>
          <FilterField label="Max questions">
            <MaxQuestionsPicker value={max} onChange={setMax} />
          </FilterField>
          <FilterField label="Sort">
            <Segmented label="Sort" value={sort} options={SORT} onChange={setSort} />
          </FilterField>
          <FilterField label="Feedback">
            <Segmented label="Feedback" value={feedback} options={FEEDBACK} onChange={setFeedback} />
          </FilterField>
          <FilterField label="Prioritise">
            <Switch
              label={prioritise ? 'On' : 'Off'}
              hint="Wording to be revisited in Stage 7"
              checked={prioritise}
              onChange={setPrioritise}
            />
          </FilterField>
        </FilterPanel>
      </Specimen>
      <SpecimenGrid>
        <Specimen label="Live count as the bar along the bottom of the take-exam screen" className="col-span-full">
          <LiveCount selected={20} available={137} bar />
        </Specimen>
        <Specimen label="Live count, capped">
          <LiveCount selected={20} available={137} />
        </Specimen>
        <Specimen label="Live count, Max">
          <LiveCount selected={137} available={137} />
        </Specimen>
        <Specimen label="Live count, updating">
          <LiveCount selected={20} available={137} loading />
        </Specimen>
        <Specimen label="Live count, nothing matches">
          <LiveCount selected={0} available={0} />
        </Specimen>
        <Specimen label="Filter, disabled">
          <Segmented label="Disabled example" value="all" options={TYPE} disabled />
        </Specimen>
        <Specimen label="Switch states">
          <div className="space-y-2">
            <Switch label="On" checked />
            <Switch label="Off" checked={false} />
            <Switch label="Disabled" checked={false} disabled />
          </div>
        </Specimen>
      </SpecimenGrid>
    </>
  )
}

function Fields() {
  return (
    <SpecimenGrid>
      <TextField label="Default" placeholder="Boyarsky Study Guide" />
      <TextField label="Filled" defaultValue="Boyarsky Study Guide" />
      <TextField label="Focus" defaultValue="Boyarsky Study Guide" data-force="focus" />
      <TextField label="Disabled" defaultValue="Boyarsky Study Guide" disabled />
      <TextField label="Error" defaultValue="" error="Give this source a name." />
      <TextArea label="Free-form answer" placeholder="Type your answer" />
      <TextArea label="Code answer" mono defaultValue={'List<String> names = new ArrayList<>();'} />
    </SpecimenGrid>
  )
}

/* ---------- Try it ---------- */

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
      { body: '`[1, 3]`', correct: false, why: '`Integer.valueOf(1)` selects `remove(Object)`, so the value 1 is removed.' },
    ],
  },
  {
    kind: 'multi' as const,
    body: 'Which **two** statements about Java records are true? (Choose two.)',
    options: [
      { body: 'A record can implement interfaces.', correct: true, why: 'Correct! Records can implement any interface.' },
      { body: "A record's component fields are implicitly `final`.", correct: true, why: 'Correct! Records are shallowly immutable, so their fields are `private final`.' },
      { body: 'A record can extend another class.', correct: false, why: 'A record implicitly extends `java.lang.Record`, and Java only allows one superclass.' },
      { body: 'A record can declare extra instance fields.', correct: false, why: 'Only static fields are allowed in the body. Instance state comes from the components.' },
    ],
  },
]

const TABLE_SAMPLE: InspectorRow[] = [
  { id: 1, bodyMd: 'A short value', isCorrect: true, flaggedAt: null, questionIds: [1, 2, 3] },
  {
    id: 2,
    bodyMd:
      'A long value folds away, so one big question or draft cannot push the rest of the table off the screen. Open it to read everything that was stored.',
    isCorrect: false,
    flaggedAt: '2026-11-04T09:30:00.000Z',
    questionIds: [],
  },
]

const PREVIEW_SAMPLES: PlannedQuestion[] = [
  {
    action: 'new',
    changes: [],
    warnings: [],
    question: {
      externalId: 'mock-q1',
      type: 'single',
      category: 'A category',
      bodyMd: 'What does this print?\n\n```java\nSystem.out.println(1 + 1);\n```',
      options: [
        { bodyMd: '`2`', isCorrect: true, explanationMd: 'Correct! Both are numbers, so they add.', explanationOrigin: 'source' },
        { bodyMd: '`11`', isCorrect: false, explanationMd: 'This would need a `String` operand.', explanationOrigin: 'generated' },
      ],
    },
  },
  {
    action: 'updated',
    changes: ['wording', 'correct answer'],
    warnings: ['The question asks for 2 answers, but 1 marked correct.'],
    question: {
      type: 'multi',
      category: 'A category',
      bodyMd: 'Which are true? Choose two.',
      lockOptionOrder: true,
      reviewNote: 'The source marks only one answer.',
      options: [
        { bodyMd: 'The first', isCorrect: true },
        { bodyMd: 'All of the above', isCorrect: false },
      ],
    },
  },
  {
    action: 'new',
    changes: [],
    warnings: [],
    duplicateOf: { place: 'Mock source, Chapter 1', answersDiffer: true },
    question: {
      externalId: 'mock-q3',
      type: 'free_form',
      category: 'A category',
      bodyMd: 'Why are tests useful?',
      modelAnswerMd: 'They catch mistakes early, and make change safer.',
    },
  },
]

const GALLERY_EXAM_CATEGORIES: ExamCategory[] = [
  { id: 1, name: 'Fetching Data', parent: null, official: true },
  { id: 2, name: 'Aggregates', parent: 'Fetching Data', official: true },
  { id: 3, name: 'UI Design', parent: null, official: true },
  { id: 4, name: 'Performance', parent: null, official: false },
]

function CategoryMapping() {
  const [choices, setChoices] = useState<Record<string, CategoryChoice>>({ 'Form stuff': { keep: true }, aggregates: { map: 2 } })
  return (
    <CategoryList
      categories={[
        { name: 'Fetching Data', count: 6, status: 'official', target: GALLERY_EXAM_CATEGORIES[0] },
        { name: 'Aggregates', count: 4, status: 'topic', target: GALLERY_EXAM_CATEGORIES[1] },
        { name: 'Performance', count: 1, status: 'unofficial', target: GALLERY_EXAM_CATEGORIES[3] },
        { name: 'Screens', count: 3, status: 'remembered', target: GALLERY_EXAM_CATEGORIES[2] },
        { name: 'aggregates', count: 2, status: 'new', suggestion: GALLERY_EXAM_CATEGORIES[1] },
        { name: 'Form stuff', count: 2, status: 'new' },
      ]}
      examCategories={GALLERY_EXAM_CATEGORIES}
      choices={{ Screens: { map: 3 }, ...choices }}
      onChoose={(name, choice) => setChoices((current) => ({ ...current, [name]: choice }))}
    />
  )
}

function Importing() {
  const [chosen, setChosen] = useState<string>()
  return (
    <>
      <SpecimenGrid>
        <Specimen label="File drop">
          <FileDrop label="Choose a file" hint={chosen ?? 'Or drop one here'} onFile={(file) => setChosen(file.name)} />
        </Specimen>
        <Specimen label="With an error">
          <FileDrop label="Choose a file" error="This file seems to be cut off." onFile={() => {}} />
        </Specimen>
        <Specimen label="Disabled">
          <FileDrop label="Choose a file" disabled onFile={() => {}} />
        </Specimen>
      </SpecimenGrid>
      <Specimen label="Problems, which stop an import" className="mt-6">
        <IssueList tone="wrong" issues={[{ location: 'Chapter 1, question 3 (q3), options', message: 'A single answer question needs exactly one correct option' }]} />
      </Specimen>
      <Specimen label="Warnings" className="mt-6">
        <IssueList tone="amber" issues={[{ location: 'Chapter 1', message: "Question numbers 4, 5 are missing and aren't in omitted." }]} />
      </Specimen>
      <Specimen label="Categories in a file: the exam's own, and names to choose a place for" className="mt-6">
        <div className="max-w-2xl">
          <CategoryMapping />
        </div>
      </Specimen>
      <Specimen label="How far a source can be trusted" className="mt-6">
        <p className="flex flex-wrap gap-2">
          <TrustTag trust="official" />
          <TrustTag trust="third_party" />
          <TrustTag trust="ai" />
        </p>
      </Specimen>
      <Specimen label="Left out" className="mt-6">
        <IssueList issues={[{ location: 'Practice exam 1, question 17', message: 'Depends on an image' }]} />
      </Specimen>
      <Specimen label="On a question in a quiz whose answer is in doubt, before answering" className="mt-6">
        <div className="max-w-2xl">
          <ReviewNotice answered={false} note="The source says 'a3', but this prints 'a12'." />
        </div>
      </Specimen>
      <Specimen label="The same question, once answered" className="mt-6">
        <div className="max-w-2xl">
          <ReviewNotice answered note="The source says 'a3', but this prints 'a12'." />
        </div>
      </Specimen>
      <Specimen label="Question previews: new, updated with warnings, and duplicate" className="mt-6">
        <div className="max-w-2xl space-y-3">
          {PREVIEW_SAMPLES.map((planned, index) => (
            <QuestionPreview key={index} planned={planned} />
          ))}
        </div>
      </Specimen>
      <Specimen label="A chapter. Open it to see its questions." className="mt-6">
        <div className="max-w-2xl">
          <ChapterPreview name="Chapter 1" questions={PREVIEW_SAMPLES} />
        </div>
      </Specimen>
    </>
  )
}

function DataTables() {
  const [sort, setSort] = useState('id')
  const [dir, setDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const columns = Object.keys(TABLE_SAMPLE[0]!)

  const rows = [...TABLE_SAMPLE].sort((a, b) => {
    const order = String(a[sort]).localeCompare(String(b[sort]), undefined, { numeric: true })
    return dir === 'asc' ? order : -order
  })

  return (
    <>
      <Specimen label="With rows: null, booleans, JSON and long text. Click a heading to sort.">
        <DataTable
          label="Sample rows"
          columns={columns}
          rows={rows}
          sort={sort}
          dir={dir}
          onSort={(column, nextDir) => {
            setSort(column)
            setDir(nextDir)
          }}
          page={page}
          pageCount={3}
          total={42}
          onPage={setPage}
        />
      </Specimen>
      <Specimen label="Empty">
        <DataTable
          label="Empty sample"
          columns={columns}
          rows={[]}
          sort="id"
          dir="asc"
          onSort={() => {}}
          page={1}
          pageCount={1}
          total={0}
          onPage={() => {}}
        />
      </Specimen>
    </>
  )
}

function QuizParts() {
  const [flagged, setFlagged] = useState(false)
  return (
    <SpecimenGrid>
      <Specimen label="Quiz progress: one segment per question, neutral because green and red mean marked">
        <QuizProgress position={7} total={20} current={7} />
      </Specimen>
      <Specimen label="Quiz progress: a short quiz, current question answered">
        <QuizProgress position={3} total={5} />
      </Specimen>
      <Specimen label="Quiz progress: 80 questions">
        <QuizProgress position={50} total={80} current={50} />
      </Specimen>
      <Specimen label="Quiz progress: over 120 questions, one line">
        <QuizProgress position={90} total={150} current={90} />
      </Specimen>
      <Specimen label="Flag: one press, and press again to unflag">
        <FlagButton flagged={flagged} onFlag={() => setFlagged(true)} onUnflag={() => setFlagged(false)} />
      </Specimen>
      <Specimen label="Flagged: the reason opens below the action row">
        <FlagReason reason="Two options say the same thing" onSaveReason={() => {}} />
      </Specimen>
      <Specimen label="Action row: answering. Next's place is kept, so Flag stays put" className="col-span-full">
        <QuizActions tools={<FlagButton flagged={false} onFlag={() => {}} onUnflag={() => {}} />}>
          <Button variant="primary" disabled>
            Submit
          </Button>
          <Button>
            Reveal answer <Kbd>R</Kbd>
          </Button>
        </QuizActions>
      </Specimen>
      <Specimen label="Action row: flagged while answering, with Skip" className="col-span-full">
        <QuizActions
          tools={<FlagButton flagged onFlag={() => {}} onUnflag={() => {}} />}
          end={<Button variant="ghost">Skip</Button>}
        >
          <Button variant="primary" disabled>
            Submit
          </Button>
          <Button>
            Reveal answer <Kbd>R</Kbd>
          </Button>
        </QuizActions>
      </Specimen>
      <Specimen label="Action row: answered" className="col-span-full">
        <QuizActions
          tools={<FlagButton flagged={false} onFlag={() => {}} onUnflag={() => {}} />}
          end={
            <Button variant="primary">
              Next <Kbd tone="on-accent">Enter</Kbd>
            </Button>
          }
        >
          <Verdict kind="incorrect" />
        </QuizActions>
      </Specimen>
      <Specimen label="Doubt: before answering">
        <ReviewNotice note="The source marks A, but B looks right." answered={false} />
      </Specimen>
      <Specimen label="Doubt: after answering">
        <ReviewNotice note="The source marks A, but B looks right." answered />
      </Specimen>
      <Specimen label="Explanation of the whole question" className="col-span-full">
        <QuestionExplanation markdown="Both use a reference type that the compiler can work out." />
      </Specimen>
      <Specimen label="Explanation written by AI" className="col-span-full">
        <QuestionExplanation markdown="`IsDataFetched` is True once the data has arrived." generated />
      </Specimen>
      <Specimen label="A missed question with no text anywhere">
        <NoExplanation />
      </Specimen>
      <Specimen label="Score" className="col-span-full">
        <QuizScore results={{ correct: 14, incorrect: 3, revealed: 2, skipped: 1, notReached: 0 }} />
      </Specimen>
      <Specimen label="Score: ended early" className="col-span-full">
        <QuizScore results={{ correct: 4, incorrect: 1, revealed: 0, skipped: 0, notReached: 15 }} />
      </Specimen>
      <Specimen label="Score: ended before answering anything" className="col-span-full">
        <QuizScore results={{ correct: 0, incorrect: 0, revealed: 0, skipped: 0, notReached: 20 }} />
      </Specimen>
    </SpecimenGrid>
  )
}

function TryIt() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [chosen, setChosen] = useState<number[]>([])
  const [outcome, setOutcome] = useState<'answering' | 'submitted' | 'revealed'>('answering')
  const [flagged, setFlagged] = useState(false)

  const question = DEMO_QUESTIONS[questionIndex]!
  const locked = outcome !== 'answering'

  function toggle(index: number) {
    if (question.kind === 'single') setChosen([index])
    else setChosen((current) => (current.includes(index) ? current.filter((x) => x !== index) : [...current, index]))
  }
  function next() {
    setQuestionIndex((index) => (index + 1) % DEMO_QUESTIONS.length)
    setChosen([])
    setOutcome('answering')
  }

  const isRight =
    question.options.every((option, index) => option.correct === chosen.includes(index))
  const verdict: VerdictKind = outcome === 'revealed' ? 'revealed' : isRight ? 'correct' : 'incorrect'

  return (
    <QuestionCard revealed={outcome === 'revealed'}>
      <div className="mb-4">
        <p className="mb-1.5 text-xs text-ink-soft">
          Question {questionIndex + 1} of {DEMO_QUESTIONS.length} · Sample
        </p>
        <QuizProgress position={questionIndex + (locked ? 1 : 0)} total={DEMO_QUESTIONS.length} current={questionIndex} />
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

/* ---------- Page ---------- */

function HomeParts() {
  const progress = (correct: number, incorrect: number, total: number) => ({ correct, incorrect, total })
  return (
    <SpecimenGrid>
      <Specimen label="An exam with sources" className="col-span-full">
        <ExamCard
          exam={{
            id: 1,
            name: 'Java SE 21 Developer Professional (OCP)',
            status: 'active',
            progress: progress(140, 60, 320),
            sources: [
              { id: 1, name: 'OCP Study Guide (Boyarsky)', progress: progress(90, 30, 120) },
              { id: 2, name: 'Enthuware Practice Sets', progress: progress(50, 30, 200) },
            ],
          }}
          onStatus={() => {}}
        />
      </Specimen>
      <Specimen label="An exam with no questions yet" className="col-span-full">
        <ExamCard
          exam={{ id: 2, name: 'Claude Developer Professional', status: 'active', progress: progress(0, 0, 0), sources: [] }}
          onStatus={() => {}}
        />
      </Specimen>
      <Specimen label="Passed: lower on the page, with its own menu" className="col-span-full">
        <ExamCard
          exam={{
            id: 3,
            name: 'OutSystems Associate Developer (O11)',
            status: 'passed',
            progress: progress(170, 10, 200),
            sources: [{ id: 3, name: 'Official practice exam', progress: progress(170, 10, 200) }],
          }}
          onStatus={() => {}}
        />
      </Specimen>
    </SpecimenGrid>
  )
}

const REVIEW_OPTIONS = (chosen: number | null) =>
  [
    { id: 1, bodyMd: '`List.of()` returns an immutable list', isCorrect: true, explanationMd: 'Adding to it throws `UnsupportedOperationException`.' },
    { id: 2, bodyMd: '`List.of()` allows `null` elements', isCorrect: false, explanationMd: 'It throws `NullPointerException` for a null element.' },
    { id: 3, bodyMd: '`List.of()` returns an `ArrayList`', isCorrect: false, explanationMd: null },
  ].map((option) => ({ ...option, chosen: option.id === chosen }))

function ResultsParts() {
  const entry = {
    questionId: 1,
    type: 'single' as const,
    bodyMd: 'Which statement about `List.of()` is true?',
    source: 'OCP Study Guide (Boyarsky)',
    category: 'Working with Arrays and Collections',
    explanationMd: null,
    reviewNote: null,
  }
  return (
    <SpecimenGrid>
      <Specimen label="By category, weakest first" className="col-span-full">
        <CategoryBreakdown
          categories={[
            { name: 'Managing Concurrent Code Execution', correct: 1, asked: 4 },
            { name: 'Working with Streams and Lambda Expressions', correct: 3, asked: 5 },
            { name: 'Controlling Program Flow', correct: 6, asked: 6 },
          ]}
        />
      </Specimen>
      <Specimen label="Review answers: incorrect">
        <ReviewEntryCard entry={{ ...entry, number: 3, outcome: 'incorrect', options: REVIEW_OPTIONS(2) }} />
      </Specimen>
      <Specimen label="Review answers: correct">
        <ReviewEntryCard entry={{ ...entry, number: 4, outcome: 'correct', options: REVIEW_OPTIONS(1) }} />
      </Specimen>
      <Specimen label="Review answers: revealed">
        <ReviewEntryCard entry={{ ...entry, number: 5, outcome: 'revealed', options: REVIEW_OPTIONS(null) }} />
      </Specimen>
      <Specimen label="Review answers: skipped, with no text at all">
        <ReviewEntryCard
          entry={{
            ...entry,
            number: 6,
            outcome: 'skipped',
            options: REVIEW_OPTIONS(null).map((option) => ({ ...option, explanationMd: null })),
          }}
        />
      </Specimen>
    </SpecimenGrid>
  )
}

export function ComponentGalleryPage() {
  return (
    <div className="lg:grid lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Gallery sections" className="mb-6 lg:sticky lg:top-6 lg:mb-0 lg:self-start">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm lg:block lg:space-y-1.5">
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-ink-soft no-underline hover:text-accent">
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <header className="mb-8">
          <h1 className="text-2xl">Component gallery</h1>
          <p className="mt-1 max-w-2xl text-ink-soft">
            The theme and every component state, using sample content. Spinner in use: <Spinner className="align-[-2px]" />
          </p>
        </header>
        <div className="space-y-10">
          <Section
            id="try-it"
            title="Try it"
            intro="The parts working together, to judge the feel. Answer or reveal, then move on. The keyboard shortcuts work on the real quiz screen."
          >
            <TryIt />
          </Section>
          <Section id="colours" title="Colours" intro="Green and red are kept for marking, so they always mean something.">
            <Colours />
          </Section>
          <Section id="type" title="Type" intro="Atkinson Hyperlegible, designed so similar characters are easy to tell apart.">
            <TypeScale />
          </Section>
          <Section id="shape" title="Spacing and shape">
            <Shape />
          </Section>
          <Section id="buttons" title="Buttons">
            <Buttons />
          </Section>
          <Section id="keycaps" title="Keycaps" intro="Show shortcuts wherever they apply.">
            <div className="flex flex-wrap gap-2">
              <Kbd>1</Kbd>
              <Kbd>2</Kbd>
              <Kbd>R</Kbd>
              <Kbd>E</Kbd>
              <Kbd>Enter</Kbd>
              <Kbd>Ctrl+Enter</Kbd>
            </div>
          </Section>
          <Section
            id="progress"
            title="Progress bars"
            intro="Green: latest attempt correct. Amber: attempted, latest attempt not correct. Empty: never attempted. The figure is % complete."
          >
            <Progress />
          </Section>
          <Section id="tiles" title="Tiles">
            <Tiles />
          </Section>
          <Section
            id="answers"
            title="Answer options"
            intro="Right and wrong always have a mark and a label as well as colour. A correct answer you missed has a dashed border."
          >
            <Answers />
          </Section>
          <Section id="quiz" title="Taking a quiz" intro="The parts of the quiz screen that aren't shown elsewhere.">
            <QuizParts />
          </Section>
          <Section id="home" title="Home" intro="Each exam, with its own progress and each source's.">
            <HomeParts />
          </Section>
          <Section id="results" title="Results" intro="The end of a quiz: how each category went, and Review answers.">
            <ResultsParts />
          </Section>
          <Section id="verdicts" title="Verdicts">
            <div className="flex flex-wrap gap-2">
              {VERDICTS.map((kind) => (
                <Verdict key={kind} kind={kind} />
              ))}
            </div>
          </Section>
          <Section id="code" title="Code blocks" intro="Press the copy icon to see its confirmation. The code icon turns syntax highlighting on and off everywhere, and the choice is saved.">
            <CodeBlocks />
          </Section>
          <Section id="markdown" title="Markdown" intro="All question and option text. Raw HTML is dropped.">
            <div className="max-w-2xl rounded-lg border border-line bg-surface p-5">
              <Markdown>{MARKDOWN_SAMPLE}</Markdown>
            </div>
          </Section>
          <Section id="filters" title="Filters">
            <Filters />
          </Section>
          <Section id="fields" title="Text fields">
            <Fields />
          </Section>
          <Section id="data-tables" title="Data tables" intro="Used by the data inspector.">
            <DataTables />
          </Section>
          <Section id="importing" title="Importing" intro="Used by the import screen.">
            <Importing />
          </Section>
        </div>
      </div>
    </div>
  )
}
