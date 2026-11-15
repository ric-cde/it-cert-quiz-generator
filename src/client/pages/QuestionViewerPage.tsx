import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { CodeBlock } from '@/components/CodeBlock'
import { CopyButton } from '@/components/CopyButton'
import { inputClass } from '@/components/Field'
import { FilterField, FilterPanel } from '@/components/FilterPanel'
import { ErrorText } from '@/components/Notices'
import { Spinner } from '@/components/Spinner'
import { Switch } from '@/components/Switch'
import { api } from '@/lib/api'
import { useFeature } from '@/lib/features'
import { HttpError, readJson } from '@/lib/http'
import { plural } from '@/lib/quiz-words'
import {
  countViewerQuestions,
  filterViewer,
  VIEWER_FILTER_LABELS,
  VIEWER_FILTERS,
  type ViewerFilter,
} from '@shared/question-viewer'

function errorMessage(error: Error) {
  if (error instanceof HttpError && error.status === 403) return 'Only admins can see this.'
  if (error instanceof HttpError && error.status === 404) return "There's no source with that number."
  return `Couldn't load this: ${error.message}`
}

/**
 * One source's questions as a single piece of JSON, narrowed by how you've done on them, to copy
 * into another LLM that writes new questions on what you found hard. The source and the toggles
 * are kept in the address.
 */
export function QuestionViewerPage() {
  const [params, setParams] = useSearchParams()
  const starsOn = useFeature('starredQuestions')

  const sourceId = /^[1-9]\d*$/.test(params.get('source') ?? '') ? Number(params.get('source')) : null
  const shown = (params.get('show') ?? '').split(',')
  const offered = VIEWER_FILTERS.filter((filter) => starsOn || filter !== 'starred')
  const filters = offered.filter((filter) => shown.includes(filter))

  function change(next: { source?: string; filters?: ViewerFilter[] }) {
    const source = next.source ?? (sourceId === null ? '' : String(sourceId))
    const show = (next.filters ?? filters).join(',')
    setParams({ ...(source ? { source } : {}), ...(show ? { show } : {}) }, { replace: true })
  }

  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: async () => readJson(await api.api.sources.$get()),
  })

  const questions = useQuery({
    queryKey: ['question-viewer', sourceId],
    enabled: sourceId !== null,
    queryFn: async () => readJson(await api.api.dev.sources[':id'].questions.$get({ param: { id: String(sourceId) } })),
  })

  const exams = useMemo(() => [...new Set((sources.data ?? []).map((source) => source.exam))], [sources.data])

  // `filters` is a new array on every render, so the JSON is rebuilt only when its contents change.
  const filterKey = filters.join(',')
  const view = useMemo(() => {
    if (!questions.data) return null
    const on = VIEWER_FILTERS.filter((filter) => filterKey.split(',').includes(filter))
    const filtered = filterViewer(questions.data, on)
    return {
      total: countViewerQuestions(questions.data),
      count: countViewerQuestions(filtered),
      json: JSON.stringify(filtered, null, 2),
    }
  }, [questions.data, filterKey])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">Question viewer</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A source&apos;s questions as JSON, with how you&apos;ve done on each, to copy into another LLM.
        </p>
      </div>

      <FilterPanel>
        <FilterField label="Source">
          <select
            aria-label="Source"
            value={sourceId ?? ''}
            onChange={(event) => change({ source: event.target.value })}
            className={clsx(inputClass(), 'max-w-full text-sm')}
          >
            <option value="" disabled>
              Choose a source
            </option>
            {exams.map((exam) => (
              <optgroup key={exam} label={exam}>
                {(sources.data ?? [])
                  .filter((source) => source.exam === exam)
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name} ({source.questions})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </FilterField>
        <FilterField label="Only show">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {offered.map((filter) => (
              <Switch
                key={filter}
                label={VIEWER_FILTER_LABELS[filter].label}
                hint={VIEWER_FILTER_LABELS[filter].hint}
                checked={filters.includes(filter)}
                onChange={(on) =>
                  change({ filters: offered.filter((item) => (item === filter ? on : filters.includes(item))) })
                }
              />
            ))}
          </div>
        </FilterField>
      </FilterPanel>

      {sources.isError && <ErrorText>{errorMessage(sources.error)}</ErrorText>}
      {sources.data?.length === 0 && <p className="text-sm text-ink-soft">No sources yet.</p>}
      {sourceId !== null && questions.isPending && (
        <p className="flex items-center gap-2 text-ink-soft">
          <Spinner /> Loading…
        </p>
      )}
      {questions.isError && <ErrorText>{errorMessage(questions.error)}</ErrorText>}

      {view && (
        <section aria-label="Questions" className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-soft" role="status">
              {filters.length === 0
                ? plural(view.total, 'question')
                : `${view.count} of ${plural(view.total, 'question')}, matching any toggle that's on`}
            </p>
            {view.count > 0 && <CopyButton label="Copy JSON" text={() => view.json} />}
          </div>
          {view.count > 0 && <CodeBlock code={view.json} />}
        </section>
      )}
    </div>
  )
}
