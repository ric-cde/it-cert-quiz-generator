import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { ChapterPreview, IssueList, TrustTag } from '@/components/BankPreview'
import { Button, buttonClass } from '@/components/Button'
import { CategoryList } from '@/components/CategoryList'
import { FileDrop } from '@/components/FileDrop'
import { Switch } from '@/components/Filters'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { parseBankFile } from '@/lib/bank-file'
import { HttpError, readJson } from '@/lib/http'
import type { CategoryChoice, ImportOptions, ImportPlan, ImportResult, SourceSummary } from '../../shared/import'
import { defaultChoice, isChoosable, SAMPLE_IMPORT_SIZE } from '../../shared/import'

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

function failureMessage(error: Error) {
  if (error instanceof HttpError && error.status === 403) return "You don't have permission to do this."
  return `Something went wrong: ${error.message}`
}

function Summary({ plan }: { plan: ImportPlan }) {
  const { counts } = plan
  const stats: [string, number][] = [
    ['New', counts.new - counts.duplicates],
    ['Updated', counts.updated],
    ['Unchanged', counts.unchanged],
    ['Duplicates', counts.duplicates],
    ['To review', counts.toReview],
    ['Left out', plan.omitted.length],
  ]
  return (
    <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-md border border-line bg-surface px-3 py-2">
          <dt className="text-xs text-ink-soft">{label}</dt>
          <dd className="text-xl font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PlanView({
  plan,
  saving,
  onImport,
  onCancel,
}: {
  plan: ImportPlan
  saving: boolean
  onImport: (options: ImportOptions) => void
  onCancel: () => void
}) {
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [categoryChoices, setCategoryChoices] = useState<Record<string, CategoryChoice>>(() =>
    Object.fromEntries(plan.categories.filter(isChoosable).map((category) => [category.name, defaultChoice(category)])),
  )
  const { counts } = plan
  const toDecide = plan.categories.filter((category) => category.status === 'new').length
  const toImport = counts.new - (includeDuplicates ? 0 : counts.duplicates) + counts.updated

  return (
    <section aria-label="Preview" className="mt-6">
      <h2 className="text-xl">{plan.source.name}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {plan.exam}. {plan.source.exists ? 'This source already exists, so these add to it.' : 'This will be a new source.'}{' '}
        Nothing is saved yet.
      </p>
      {(plan.source.trust || plan.source.reference) && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {plan.source.trust && <TrustTag trust={plan.source.trust} />}
          {plan.source.reference && <SourceReference reference={plan.source.reference} />}
        </p>
      )}

      <Summary plan={plan} />

      {counts.deleted > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          {plural(counts.deleted, 'question')} deleted in the app will stay deleted.
        </p>
      )}
      {plan.notInFile > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          {plural(plan.notInFile, 'question')} already in this source {plan.notInFile === 1 ? "isn't" : "aren't"} in this file,
          and will be left alone.
        </p>
      )}

      {plan.warnings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base">{plural(plan.warnings.length, 'warning')}</h3>
          <p className="mb-2 text-sm text-ink-soft">These are probably mistakes, but won't stop the import.</p>
          <IssueList issues={plan.warnings} tone="amber" />
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-base">Categories</h3>
        <p className="mb-2 text-sm text-ink-soft">
          {toDecide > 0
            ? `${plural(toDecide, 'name')} ${toDecide === 1 ? "isn't" : "aren't"} one of this exam's. Choose where each goes. Your choice is remembered for next time.`
            : "Every name in this file is already known to this exam."}
        </p>
        <CategoryList
          categories={plan.categories}
          examCategories={plan.examCategories}
          choices={categoryChoices}
          disabled={saving}
          onChoose={(name, choice) => setCategoryChoices((current) => ({ ...current, [name]: choice }))}
        />
      </div>

      {plan.omitted.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base">Left out of this file</h3>
          <p className="mb-2 text-sm text-ink-soft">These questions from the source won't be in the app.</p>
          <IssueList issues={plan.omitted.map((item) => ({ location: item.reference, message: item.reason }))} />
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-base">Questions</h3>
        <div className="space-y-2">
          {plan.chapters.map((chapter) => (
            <ChapterPreview key={chapter.name} name={chapter.name} questions={chapter.questions} />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-4">
        {counts.duplicates > 0 && (
          <div className="mb-4">
            <Switch
              label={`Also import ${plural(counts.duplicates, 'duplicate')}`}
              checked={includeDuplicates}
              onChange={setIncludeDuplicates}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            loading={saving}
            disabled={toImport === 0}
            onClick={() => onImport({ includeDuplicates, categoryChoices })}
          >
            {toImport === 0 ? 'Nothing to import' : `Import ${plural(toImport, 'question')}`}
          </Button>
          {counts.total > SAMPLE_IMPORT_SIZE && (
            <Button disabled={saving} onClick={() => onImport({ includeDuplicates, categoryChoices, limit: SAMPLE_IMPORT_SIZE })}>
              Try the first {SAMPLE_IMPORT_SIZE} only
            </Button>
          )}
          <Button variant="ghost" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </section>
  )
}

function ResultView({ result, onAnother }: { result: ImportResult; onAnother: () => void }) {
  const lines = [
    `${plural(result.added, 'question')} added`,
    result.updated > 0 && `${result.updated} updated`,
    result.unchanged > 0 && `${result.unchanged} unchanged`,
    result.skippedDuplicates > 0 && `${plural(result.skippedDuplicates, 'duplicate')} skipped`,
    result.skippedDeleted > 0 && `${result.skippedDeleted} kept deleted`,
    result.notImportedByLimit > 0 && `${result.notImportedByLimit} not imported in this trial`,
  ].filter(Boolean)

  return (
    <section aria-label="Import result" className="mt-6 rounded-lg border border-line bg-surface p-5">
      <h2 className="text-xl">Imported</h2>
      <p className="mt-1" role="status">
        {lines.join(', ')}.
      </p>
      {result.toReview > 0 && (
        <div className="mt-4 rounded-md border border-amber bg-amber-soft px-4 py-3">
          <p className="font-semibold">
            {plural(result.toReview, 'question')} in this source {result.toReview === 1 ? 'needs' : 'need'} your review
          </p>
          <p className="mb-2 text-sm">
            Something looked wrong, such as the source's answer. {result.toReview === 1 ? 'It stays' : 'They stay'} in quizzes with
            a warning until you decide.
          </p>
          <Link to={`/review?source=${result.sourceId}`} className={buttonClass({ variant: 'primary', size: 'sm' })}>
            Review {result.toReview === 1 ? 'it' : 'them'} now
          </Link>
        </div>
      )}
      {result.notImportedByLimit > 0 && (
        <p className="mt-2 text-sm text-ink-soft">
          Import the same file again at any time to add the rest. Questions already in won't be duplicated.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button onClick={onAnother}>Import another file</Button>
        <Link to="/dev/data/questions">See them in the data inspector</Link>
      </div>
    </section>
  )
}

/** A URL becomes a link. Anything else, such as a book and edition, shows as text. */
function SourceReference({ reference }: { reference: string }) {
  if (/^https?:\/\/\S+$/.test(reference)) {
    return (
      <a href={reference} target="_blank" rel="noreferrer" className="break-all">
        {reference}
      </a>
    )
  }
  return <span className="break-words">{reference}</span>
}

function SourceRow({ source }: { source: SourceSummary }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({
    mutationFn: async () => readJson(await api.api.sources[':id'].$delete({ param: { id: String(source.id) } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  })

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold break-words">
          {source.name} {source.trust && <TrustTag trust={source.trust} />}
        </p>
        {source.reference && (
          <p className="text-sm text-ink-soft">
            <SourceReference reference={source.reference} />
          </p>
        )}
        <p className="text-sm break-words text-ink-soft">
          {source.exam}. {plural(source.chapters, 'chapter')}, {plural(source.questions, 'question')}
          {source.flagged > 0 && `, ${source.flagged} flagged`}
        </p>
        {source.toReview > 0 && (
          <p className="text-sm">
            <Link to={`/review?source=${source.id}`}>{plural(source.toReview, 'question')} to review</Link>
          </p>
        )}
        {remove.isError && (
          <p role="alert" className="text-sm font-semibold text-wrong-ink">
            {failureMessage(remove.error)}
          </p>
        )}
      </div>
      {source.attempts > 0 ? (
        <p className="text-sm text-ink-soft">{plural(source.attempts, 'attempt')}, so it can't be deleted here</p>
      ) : confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Delete all of it?</span>
          <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Yes, delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setConfirming(true)} aria-label={`Delete ${source.name}`}>
          Delete
        </Button>
      )}
    </li>
  )
}

function SourceList() {
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: async () => readJson(await api.api.sources.$get()),
  })

  return (
    <section aria-labelledby="sources-heading" className="mt-10">
      <h2 id="sources-heading" className="text-xl">
        Sources in the app
      </h2>
      <p className="mt-1 mb-3 text-sm text-ink-soft">
        Deleting removes a source and all its questions, which is useful for clearing out a trial import.
      </p>
      {sources.isPending && <Spinner />}
      {sources.isError && (
        <p role="alert" className="text-sm font-semibold text-wrong-ink">
          {failureMessage(sources.error)}
        </p>
      )}
      {sources.data?.length === 0 && <p className="text-sm text-ink-soft">None yet.</p>}
      {sources.data && sources.data.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {sources.data.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** Load a question bank file: check it, see what it would do, then save it. */
export function ImportPage() {
  const queryClient = useQueryClient()
  const [bank, setBank] = useState<unknown>()
  const [fileError, setFileError] = useState<string>()

  const preview = useMutation({
    mutationFn: async (raw: unknown) => readJson(await api.api.import.preview.$post({ json: { bank: raw } })),
  })
  const commit = useMutation({
    mutationFn: async (options: ImportOptions) => readJson(await api.api.import.commit.$post({ json: { bank, ...options } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  })

  function reset() {
    setBank(undefined)
    setFileError(undefined)
    preview.reset()
    commit.reset()
  }

  async function chooseFile(file: File) {
    reset()
    const parsed = parseBankFile(await file.text())
    if (!parsed.ok) {
      setFileError(`${file.name}: ${parsed.message}`)
      return
    }
    setBank(parsed.bank)
    preview.mutate(parsed.bank)
  }

  const plan = preview.data?.ok ? preview.data : undefined
  const rejected = preview.data && !preview.data.ok ? preview.data : undefined

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">Import questions</h1>
      <p className="mt-1 text-ink-soft">
        Load a question bank file, made with the skill in the Claude app. You'll see a preview, and nothing is saved until you
        press Import.
      </p>

      {commit.data?.ok ? (
        <ResultView result={commit.data} onAnother={reset} />
      ) : (
        <>
          {!plan && (
            <div className="mt-6">
              <FileDrop
                label="Choose a question bank file"
                hint="Or drop a .json file here"
                accept=".json,application/json"
                error={fileError}
                disabled={preview.isPending}
                onFile={chooseFile}
              />
            </div>
          )}

          {preview.isPending && (
            <p className="mt-4 flex items-center gap-2 text-ink-soft">
              <Spinner /> Checking the file…
            </p>
          )}
          {preview.isError && (
            <p role="alert" className="mt-4 text-sm font-semibold text-wrong-ink">
              {failureMessage(preview.error)}
            </p>
          )}

          {rejected && (
            <section aria-label="Problems" className="mt-6">
              <h2 className="text-xl">This file can't be imported yet</h2>
              <p className="mt-1 mb-3 text-sm text-ink-soft">
                Nothing was saved. Fix {rejected.problems.length === 1 ? 'this' : `these ${rejected.problems.length} problems`}{' '}
                and choose the file again.
              </p>
              <IssueList issues={rejected.problems} tone="wrong" />
            </section>
          )}

          {plan && (
            <PlanView
              plan={plan}
              saving={commit.isPending}
              onImport={(options) => commit.mutate(options)}
              onCancel={reset}
            />
          )}
          {commit.isError && (
            <p role="alert" className="mt-4 text-sm font-semibold text-wrong-ink">
              {failureMessage(commit.error)}
            </p>
          )}
        </>
      )}

      <SourceList />
    </div>
  )
}
