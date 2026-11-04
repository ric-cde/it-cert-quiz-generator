import clsx from 'clsx'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CellValue, InspectorRow, SortDir } from '../../shared/inspector'
import { Button } from './Button'

const LONG_VALUE = 80

/** Shows a value exactly as stored. Long values fold away, so a row stays one line until you open it. */
export function DataCell({ value }: { value: CellValue | undefined }) {
  if (value === null || value === undefined) return <span className="text-ink-soft italic">null</span>
  if (typeof value === 'boolean') return <span className="font-mono">{String(value)}</span>
  if (typeof value === 'number') return <span className="font-mono tabular-nums">{value}</span>

  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 1)
  const mono = typeof value !== 'string'
  if (text.length <= LONG_VALUE) return <span className={clsx(mono && 'font-mono', 'whitespace-pre-wrap')}>{text}</span>

  return (
    <details className="min-w-64">
      <summary className="cursor-pointer">
        <span className={clsx(mono && 'font-mono')}>{text.slice(0, LONG_VALUE)}…</span>{' '}
        <span className="text-ink-soft">({text.length} characters)</span>
      </summary>
      <p className={clsx(mono && 'font-mono', 'mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap break-words')}>{text}</p>
    </details>
  )
}

/** A read-only table with sortable columns and paging. Scrolls inside itself on narrow screens. */
export function DataTable({
  label,
  columns,
  rows,
  rowKey,
  sort,
  dir,
  onSort,
  page,
  pageCount,
  total,
  onPage,
}: {
  label: string
  columns: string[]
  rows: InspectorRow[]
  rowKey?: (row: InspectorRow, index: number) => string | number
  sort: string
  dir: SortDir
  onSort: (column: string, dir: SortDir) => void
  page: number
  pageCount: number
  total: number
  onPage: (page: number) => void
}) {
  const SortIcon = dir === 'asc' ? ArrowUp : ArrowDown

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      {/* Focusable so keyboard users can scroll it sideways. */}
      <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-t-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong bg-sunken">
              {columns.map((column) => {
                const active = column === sort
                return (
                  <th
                    key={column}
                    scope="col"
                    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="p-0 text-left align-bottom"
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column, active && dir === 'asc' ? 'desc' : 'asc')}
                      className={clsx(
                        'flex min-h-9 w-full cursor-pointer items-center gap-1 px-3 font-mono text-xs font-semibold whitespace-nowrap hover:text-accent',
                        active ? 'text-accent-strong' : 'text-ink-soft',
                      )}
                    >
                      {column}
                      {active && <SortIcon aria-hidden="true" className="size-3.5" />}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={rowKey?.(row, index) ?? index} className="border-b border-line last:border-b-0 hover:bg-paper">
                {columns.map((column) => (
                  <td key={column} className="max-w-md px-3 py-2 align-top">
                    <DataCell value={row[column]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-soft">No rows yet</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm text-ink-soft">
        <span className="tabular-nums">
          {total} {total === 1 ? 'row' : 'rows'}
        </span>
        <nav aria-label={`Pages of ${label}`} className="flex items-center gap-2">
          <Button
            size="sm"
            iconOnly
            variant="ghost"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <span className="tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            size="sm"
            iconOnly
            variant="ghost"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </nav>
      </div>
    </div>
  )
}
