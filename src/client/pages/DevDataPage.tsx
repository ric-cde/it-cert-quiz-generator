import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { RefreshCw } from 'lucide-react'
import { NavLink, useParams, useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { HttpError, readJson } from '@/lib/http'
import type { SortDir } from '../../shared/inspector'

const DEFAULT_TABLE = 'users'

function errorMessage(error: Error, table: string) {
  if (error instanceof HttpError && error.status === 403) return 'Only admins can see this.'
  if (error instanceof HttpError && error.status === 404) return `There's no table called "${table}".`
  return `Couldn't load this: ${error.message}`
}

/** Every table, read-only, to confirm that each action wrote what it should. */
export function DevDataPage() {
  const table = useParams().table ?? DEFAULT_TABLE
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()

  const page = Number(params.get('page')) || 1
  const sort = params.get('sort') ?? undefined
  const dir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc'

  const summaries = useQuery({
    queryKey: ['inspector', 'tables'],
    queryFn: async () => readJson(await api.api.dev.tables.$get()),
  })

  const data = useQuery({
    queryKey: ['inspector', 'table', table, page, sort, dir],
    queryFn: async () => {
      const query = { page: String(page), sort, dir }
      return readJson(await api.api.dev.tables[':name'].$get({ param: { name: table }, query }))
    },
    // Keep the rows on screen while the next page loads, but never show one table's rows under another's name.
    placeholderData: (previous) => (previous?.name === table ? previous : undefined),
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="min-w-0">
        <h1 className="text-2xl">Data inspector</h1>
        <p className="mt-1 text-sm text-ink-soft">Read-only.</p>
        <nav aria-label="Tables" className="mt-4">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {(summaries.data ?? []).map((summary) => (
              <li key={summary.name}>
                <NavLink
                  to={`/dev/data/${summary.name}`}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center justify-between gap-3 rounded-sm px-2 py-1 font-mono text-xs',
                      isActive || (summary.name === DEFAULT_TABLE && table === DEFAULT_TABLE)
                        ? 'bg-accent-soft font-semibold text-accent-strong'
                        : 'text-ink hover:bg-sunken hover:text-ink',
                    )
                  }
                >
                  {summary.name}
                  <span className="tabular-nums text-ink-soft">{summary.rowCount}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {summaries.isError && (
          <p role="alert" className="mt-4 text-sm font-semibold text-wrong-ink">
            {errorMessage(summaries.error, table)}
          </p>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-lg">{table}</h2>
          <Button
            size="sm"
            variant="secondary"
            loading={data.isFetching}
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['inspector'] })}
          >
            {!data.isFetching && <RefreshCw aria-hidden="true" className="size-3.5" />}
            Refresh
          </Button>
        </div>

        {data.isPending && (
          <p className="flex items-center gap-2 text-ink-soft">
            <Spinner /> Loading…
          </p>
        )}
        {data.isError && (
          <p role="alert" className="text-sm font-semibold text-wrong-ink">
            {errorMessage(data.error, table)}
          </p>
        )}
        {data.data && (
          <DataTable
            label={data.data.name}
            columns={data.data.columns}
            rows={data.data.rows}
            sort={data.data.sort}
            dir={data.data.dir}
            page={data.data.page}
            pageCount={data.data.pageCount}
            total={data.data.total}
            onSort={(column, nextDir) => setParams({ sort: column, dir: nextDir })}
            onPage={(next) => {
              const nextParams = new URLSearchParams(params)
              nextParams.set('page', String(next))
              setParams(nextParams)
            }}
          />
        )}
      </div>
    </div>
  )
}
