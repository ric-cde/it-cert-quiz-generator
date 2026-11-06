import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  FilterField,
  FilterPanel,
  LiveCount,
  type MaxQuestions,
  MaxQuestionsPicker,
  nextMaxQuestions,
  Segmented,
} from '@/components/Filters'
import { Spinner } from '@/components/Spinner'
import { RandomTile, SourceTile, Tile, TileGrid } from '@/components/Tile'
import { api } from '@/lib/api'
import { HttpError, readJson } from '@/lib/http'
import { FEEDBACK_NAMES, SORT_OPTIONS, STATUS_OPTIONS } from '@/lib/quiz-words'
import { readChoices, saveChoices, type TakeExamChoices } from '@/lib/remembered'
import { isForShortcuts } from '@/lib/shortcuts'
import { DEFAULT_QUIZ_DEFAULTS, type Feedback, FEEDBACK_MODES, type QuizSort } from '../../shared/domain'
import { buildPool, practiceView } from '../../shared/practice'
import { isRandom, type Selection, type Status, STATUSES } from '../../shared/selection'

/* ---------- The selection lives in the address, so Back and links (such as from home) keep it ---------- */

const KEYS = { categoryIds: 'categories', sourceIds: 'sources', chapterIds: 'chapters' } as const
type TileKind = keyof typeof KEYS

/** Unanswered unless the address says otherwise, so a new session starts on fresh questions. */
export const DEFAULT_STATUS: Status = 'unanswered'

function readIds(params: URLSearchParams, key: string) {
  return (params.get(key) ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
}

export function readSelection(params: URLSearchParams): Selection {
  const status = params.get('status')
  return {
    categoryIds: readIds(params, KEYS.categoryIds),
    sourceIds: readIds(params, KEYS.sourceIds),
    chapterIds: readIds(params, KEYS.chapterIds),
    status: (STATUSES as readonly string[]).includes(status ?? '') ? (status as Status) : DEFAULT_STATUS,
  }
}

function writeSelection(selection: Selection) {
  const params = new URLSearchParams()
  for (const kind of Object.keys(KEYS) as TileKind[]) {
    if (selection[kind].length) params.set(KEYS[kind], selection[kind].join(','))
  }
  if (selection.status !== DEFAULT_STATUS) params.set('status', selection.status)
  return params
}

const toggled = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id])

/* ---------- The screen ---------- */

const FEEDBACK_OPTIONS = FEEDBACK_MODES.map((value) => ({ value, label: FEEDBACK_NAMES[value] }))

/**
 * The take-exam screen. It loads the exam's question metadata once, then works out every count,
 * bar and the live count in the browser as you click, with the same functions the server uses to
 * create the quiz.
 */
export function TakeExamPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selection = readSelection(params)
  const random = isRandom(selection)

  const [expanded, setExpanded] = useState<number[]>(() => selection.sourceIds)
  // Remembered for each exam in this browser. Until you choose, they follow your saved defaults.
  const [chosen, setChosen] = useState<TakeExamChoices>(() => readChoices(id))
  function choose(change: TakeExamChoices) {
    const next = { ...chosen, ...change }
    setChosen(next)
    saveChoices(id, next)
  }

  const settings = useQuery({ queryKey: ['settings'], queryFn: async () => readJson(await api.api.settings.$get()) })
  const defaults = settings.data?.quizDefaults ?? DEFAULT_QUIZ_DEFAULTS
  const max: MaxQuestions = chosen.max ?? defaults.maxQuestions
  const feedback: Feedback = chosen.feedback ?? defaults.feedback
  const sort: QuizSort = chosen.sort ?? 'random'

  const practice = useQuery({
    queryKey: ['practice', id],
    queryFn: async () => readJson(await api.api.exams[':id'].practice.$get({ param: { id } })),
  })
  const pool = useMemo(() => (practice.data ? buildPool(practice.data) : null), [practice.data])
  const selectionKey = params.toString()
  // Keyed on the address rather than the selection object, which is new on every render.
  const view = useMemo(
    () => (practice.data && pool ? practiceView(practice.data, pool, selection) : null),
    [practice.data, pool, selectionKey],
  )

  const start = useMutation({
    mutationFn: async () =>
      readJson(
        await api.api.quizzes.$post({
          json: { examId: Number(id), feedback, sort, ...selection, ...(max === 'max' ? {} : { limit: max }) },
        }),
      ),
    onSuccess: ({ id: quizId }) => navigate(`/quiz/${quizId}`),
  })

  function change(next: Partial<Selection>) {
    setParams(writeSelection({ ...selection, ...next }), { replace: true })
  }
  function chooseRandom() {
    change({ categoryIds: [], sourceIds: [], chapterIds: [] })
  }
  function toggleSource(sourceId: number) {
    const leaving = selection.sourceIds.includes(sourceId)
    const ownChapters = new Set(practice.data?.chapters.filter((c) => c.sourceId === sourceId).map((c) => c.id))
    change({
      sourceIds: toggled(selection.sourceIds, sourceId),
      // Letting go of a source lets go of the chapters picked inside it too.
      chapterIds: leaving ? selection.chapterIds.filter((chapterId) => !ownChapters.has(chapterId)) : selection.chapterIds,
    })
  }
  function nextStatus() {
    const index = STATUS_OPTIONS.findIndex((option) => option.value === selection.status)
    change({ status: STATUS_OPTIONS[(index + 1) % STATUS_OPTIONS.length]!.value })
  }

  const otherBox = useRef<HTMLInputElement>(null)
  function nextMax() {
    const next = nextMaxQuestions(max)
    if (next === null) otherBox.current?.focus()
    else choose({ max: next })
  }

  const selected = view ? (max === 'max' ? view.available : Math.min(max, view.available)) : 0
  const canStart = view !== null && view.available > 0 && !start.isPending

  // Enter starts, R picks Random, S moves through the status options, and M through Max questions.
  const onKey = useRef<(event: KeyboardEvent) => void>(() => {})
  onKey.current = (event) => {
    if (!view || !isForShortcuts(event)) return
    const key = event.key.toLowerCase()
    if (key === 'enter' && canStart) {
      event.preventDefault()
      start.mutate()
    } else if (key === 'r') {
      event.preventDefault()
      chooseRandom()
    } else if (key === 's') {
      event.preventDefault()
      nextStatus()
    } else if (key === 'm') {
      event.preventDefault()
      nextMax()
    }
  }
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  if (practice.isPending) {
    return (
      <p>
        <Spinner />
      </p>
    )
  }
  if (practice.isError || !view) {
    const missing = practice.error instanceof HttpError && practice.error.status === 404
    return (
      <div role="alert">
        <p className="font-semibold text-wrong-ink">
          {missing ? "There's no such exam." : `Couldn't load this exam: ${practice.error?.message}`}
        </p>
        <p className="mt-2 text-sm">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    )
  }

  const { exam } = practice.data
  const empty = practice.data.questions.length === 0
  // Tiles narrow only across types, so with no categories picked, every category with questions
  // left is in the quiz, and the same goes for sources and chapters with no source or chapter picks.
  const noCategories = selection.categoryIds.length === 0
  const noTree = selection.sourceIds.length === 0 && selection.chapterIds.length === 0

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
        </Link>
        <h1 className="mt-2 text-2xl break-words">{exam.name}</h1>
        <p className="text-sm text-ink-soft">{exam.subject}</p>
      </div>

      {empty ? (
        <p className="rounded-lg border border-line bg-surface p-4 text-sm shadow-card">
          No questions for this exam yet. <Link to="/import">Import some</Link> to start practising.
        </p>
      ) : (
        <>
          <section aria-label="Options">
            <FilterPanel>
              <FilterField label="Status" shortcut="S">
                <Segmented label="Status" value={selection.status} options={STATUS_OPTIONS} onChange={(status) => change({ status })} />
              </FilterField>
              <FilterField label="Max questions" shortcut="M">
                <MaxQuestionsPicker value={max} inputRef={otherBox} onChange={(value) => choose({ max: value })} />
              </FilterField>
              <FilterField label="Sort">
                <Segmented label="Sort" value={sort} options={SORT_OPTIONS} onChange={(value) => choose({ sort: value })} />
              </FilterField>
              <FilterField label="Feedback">
                <Segmented
                  label="Feedback"
                  value={feedback}
                  options={FEEDBACK_OPTIONS}
                  onChange={(value) => choose({ feedback: value })}
                />
              </FilterField>
            </FilterPanel>
          </section>

          <section aria-labelledby="choose-heading" className="space-y-4">
            <h2 id="choose-heading" className="sr-only">
              Choose questions
            </h2>
            <RandomTile selected={random} shortcut="R" onClick={chooseRandom} />
            {random && <p className="-mt-1 text-sm text-ink-soft">Pick any tile below to narrow the questions down.</p>}

            {/* Side by side on wide screens, Sources on the left. One column on narrower ones, Categories first. */}
            <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-2">
              <div className="lg:order-2">
                <h3 className={clsx('mb-2 text-sm', random && 'text-ink-soft')}>Categories</h3>
                <TileGrid>
                  {view.categories.map((category) => (
                    <Tile
                      key={category.id}
                      title={category.name}
                      origin={category.official ? 'official' : 'unofficial'}
                      count={category.count}
                      empty={category.empty}
                      progress={category.progress}
                      selected={selection.categoryIds.includes(category.id)}
                      diminished={random}
                      included={!random && noCategories}
                      emphasis={selection.status}
                      onClick={() => change({ categoryIds: toggled(selection.categoryIds, category.id) })}
                    />
                  ))}
                </TileGrid>
              </div>

              <div className="lg:order-1">
                <h3 className={clsx('mb-2 text-sm', random && 'text-ink-soft')}>Sources</h3>
                {/* One source per row, as wide as two category tiles, with its chapters two across. */}
                <TileGrid columns="single-wide">
                  {view.sources.map((source) => {
                    const sourceSelected = selection.sourceIds.includes(source.id)
                    const narrowed = source.chapters.some((chapter) => selection.chapterIds.includes(chapter.id))
                    return (
                      <SourceTile
                        key={source.id}
                        title={source.name}
                        count={source.count}
                        empty={source.empty}
                        progress={source.progress}
                        chapterCount={source.chapters.length}
                        selected={sourceSelected}
                        diminished={random}
                        included={!random && noTree}
                        emphasis={selection.status}
                        onClick={() => toggleSource(source.id)}
                        expanded={expanded.includes(source.id)}
                        onToggleExpanded={() => setExpanded((ids) => toggled(ids, source.id))}
                        chapterHint={
                          sourceSelected
                            ? narrowed
                              ? `Only the chapters you've picked from ${source.name}.`
                              : 'All chapters are included. Pick some to narrow further.'
                            : undefined
                        }
                      >
                        {source.chapters.map((chapter) => (
                          <Tile
                            key={chapter.id}
                            title={chapter.name}
                            count={chapter.count}
                            empty={chapter.empty}
                            progress={chapter.progress}
                            selected={selection.chapterIds.includes(chapter.id)}
                            diminished={random}
                            included={!random && (noTree || (sourceSelected && !narrowed))}
                            emphasis={selection.status}
                            onClick={() => change({ chapterIds: toggled(selection.chapterIds, chapter.id) })}
                          />
                        ))}
                      </SourceTile>
                    )
                  })}
                </TileGrid>
              </div>
            </div>
          </section>

          {/*
            A child of the whole page, so it stays in view while you scroll through the tiles. The
            margins stretch it from the centred page out to both edges of the window.
          */}
          <div className="sticky bottom-0 z-10 mx-[calc(50%-50cqw)]">
            <LiveCount
              bar
              shortcut="Enter"
              selected={selected}
              available={view.available}
              loading={start.isPending}
              onStart={() => start.mutate()}
            />
          </div>
          {start.isError && (
            <p role="alert" className="text-sm font-semibold text-wrong-ink">
              Couldn't start that quiz: {start.error.message}
            </p>
          )}
        </>
      )}
    </div>
  )
}
