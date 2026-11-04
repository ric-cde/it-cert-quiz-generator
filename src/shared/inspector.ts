/** Shapes returned by the data inspector API at /api/dev/tables. */

export const INSPECTOR_PAGE_SIZE = 20

// Not recursive, because that is too deep for the `hc` client's types. JSON columns are only displayed.
export type CellValue = string | number | boolean | null | unknown[] | { [key: string]: unknown }
export type InspectorRow = Record<string, CellValue>

export type SortDir = 'asc' | 'desc'

export type TableSummary = { name: string; rowCount: number }

export type TableData = {
  name: string
  columns: string[]
  rows: InspectorRow[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  sort: string
  dir: SortDir
}
