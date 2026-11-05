import { asc, count, desc, getTableColumns, getTableName } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { InspectorRow, SortDir, TableData, TableSummary } from '../shared/inspector'
import { INSPECTOR_PAGE_SIZE } from '../shared/inspector'
import type { Db } from './db'
import * as schema from './db/schema'

/** Every table, in the order the spec lists them. A test checks that none is missing. */
export const INSPECTOR_TABLES: SQLiteTable[] = [
  schema.users,
  schema.subjects,
  schema.exams,
  schema.userExams,
  schema.categories,
  schema.categoryAliases,
  schema.sources,
  schema.chapters,
  schema.questions,
  schema.options,
  schema.explanations,
  schema.quizzes,
  schema.attempts,
  schema.questionStats,
  schema.drafts,
  schema.aiCalls,
  schema.settings,
]

const tableCount = (db: Db, table: SQLiteTable) => db.select({ n: count() }).from(table).get()!.n

export function listTables(db: Db): TableSummary[] {
  return INSPECTOR_TABLES.map((table) => ({ name: getTableName(table), rowCount: tableCount(db, table) }))
}

export function findTable(name: string) {
  return INSPECTOR_TABLES.find((table) => getTableName(table) === name)
}

export class UnknownColumnError extends Error {}

export function readTable(
  db: Db,
  table: SQLiteTable,
  { page, sort, dir }: { page: number; sort?: string; dir: SortDir },
): TableData {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>
  const names = Object.keys(columns)
  const sortName = sort ?? names[0]!
  if (!names.includes(sortName)) throw new UnknownColumnError(sortName)

  const total = tableCount(db, table)
  const pageCount = Math.max(1, Math.ceil(total / INSPECTOR_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const by = dir === 'asc' ? asc : desc

  // The other columns break ties, so a row can't move between pages or appear on two.
  const tieBreakers = names.filter((name) => name !== sortName).map((name) => asc(columns[name]!))
  const rows = db
    .select()
    .from(table)
    .orderBy(by(columns[sortName]!), ...tieBreakers)
    .limit(INSPECTOR_PAGE_SIZE)
    .offset((safePage - 1) * INSPECTOR_PAGE_SIZE)
    .all()

  return {
    name: getTableName(table),
    columns: names,
    // Dates become ISO strings here rather than leaving it to JSON, so the type is honest.
    rows: JSON.parse(JSON.stringify(rows)) as InspectorRow[],
    total,
    page: safePage,
    pageCount,
    pageSize: INSPECTOR_PAGE_SIZE,
    sort: sortName,
    dir,
  }
}
