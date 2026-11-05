import { getTableName, is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { INSPECTOR_PAGE_SIZE, type TableData, type TableSummary } from '../shared/inspector'
import { createApi } from './app'
import { type Db, openDb } from './db'
import * as schema from './db/schema'
import { users } from './db/schema'
import { INSPECTOR_TABLES } from './inspector'

let db: Db
let api: ReturnType<typeof createApi>

beforeEach(() => {
  db = openDb(':memory:')
  api = createApi(db)
})

const getTable = async (path: string) => {
  const res = await api.request(`/api/dev/tables/${path}`)
  expect(res.status).toBe(200)
  return (await res.json()) as TableData
}

describe('GET /api/dev/tables', () => {
  it('lists every table in the schema, so a new table cannot be forgotten', async () => {
    const allTables = Object.values(schema).filter((value) => is(value, SQLiteTable))
    expect(INSPECTOR_TABLES.map(getTableName).sort()).toEqual(allTables.map(getTableName).sort())

    const res = await api.request('/api/dev/tables')
    const list = (await res.json()) as TableSummary[]
    expect(list).toHaveLength(17)
    expect(list.find((t) => t.name === 'users')).toEqual({ name: 'users', rowCount: 1 })
    expect(list.find((t) => t.name === 'categories')?.rowCount).toBe(38)
    expect(list.find((t) => t.name === 'questions')?.rowCount).toBe(0)
  })
})

describe('GET /api/dev/tables/:name', () => {
  it('returns columns and rows', async () => {
    const table = await getTable('users')
    expect(table.columns).toEqual(['id', 'name', 'role'])
    expect(table.rows).toEqual([{ id: 1, name: 'Admin', role: 'admin' }])
    expect(table).toMatchObject({ total: 1, page: 1, pageCount: 1, sort: 'id', dir: 'asc' })
  })

  it('finds tables whose names have underscores, and returns columns for an empty one', async () => {
    const table = await getTable('question_stats')
    expect(table.columns).toContain('latestCorrect')
    expect(table.rows).toEqual([])
    expect(table).toMatchObject({ total: 0, page: 1, pageCount: 1 })
  })

  it('shows JSON columns as real values', async () => {
    const table = await getTable('settings')
    expect(table.rows[0]!.priorityWeights).toMatchObject({ difficulty: 1 })
  })

  it('shows timestamps as readable dates', async () => {
    db.insert(schema.aiCalls)
      .values({
        purpose: 'judging',
        model: 'mock-model',
        inputTokens: 1,
        outputTokens: 2,
        createdAt: new Date('2026-11-04T09:30:00.000Z'),
      })
      .run()
    const table = await getTable('ai_calls')
    expect(table.rows[0]!.createdAt).toBe('2026-11-04T09:30:00.000Z')
  })

  it('sorts by any column in either direction', async () => {
    const asc = await getTable('categories?sort=name&dir=asc')
    const desc = await getTable('categories?sort=name&dir=desc')
    expect(asc.rows[0]!.name).toBe('Agents and Workflows')
    expect(desc.rows[0]!.name).toBe('Working with Streams and Lambda Expressions')
    expect(desc).toMatchObject({ sort: 'name', dir: 'desc' })
  })

  it('sorts by a real number column numerically', async () => {
    const table = await getTable('categories?sort=weight&dir=desc')
    expect(table.rows[0]).toMatchObject({ name: 'Applications and Integration', weight: 33.1 })
  })

  it('splits rows across pages with none lost or repeated, even when sorting by a column with ties', async () => {
    const first = await getTable('categories?sort=examId')
    const second = await getTable('categories?sort=examId&page=2')

    expect(first.rows).toHaveLength(INSPECTOR_PAGE_SIZE)
    expect(second.rows).toHaveLength(38 - INSPECTOR_PAGE_SIZE)
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 38 })
    expect(new Set([...first.rows, ...second.rows].map((row) => row.id)).size).toBe(38)
  })

  it('gives the last page when asked for one past the end', async () => {
    expect(await getTable('categories?page=99')).toMatchObject({ page: 2, pageCount: 2 })
  })

  it('is a 404 for an unknown table', async () => {
    expect((await api.request('/api/dev/tables/nope')).status).toBe(404)
  })

  it.each(['sort=nope', 'dir=sideways', 'page=0', 'page=abc'])('is a 400 for %s', async (query) => {
    expect((await api.request(`/api/dev/tables/users?${query}`)).status).toBe(400)
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('has no %s route, because it is read-only', async (method) => {
    expect((await api.request('/api/dev/tables/users', { method })).status).toBe(404)
    expect(db.select().from(users).all()).toHaveLength(1)
  })
})

describe('roles', () => {
  it('reports the seeded admin as the current user', async () => {
    const res = await api.request('/api/me')
    expect(await res.json()).toEqual({ id: 1, name: 'Admin', role: 'admin' })
  })

  it.each(['editor', 'learner'] as const)('refuses the inspector for an %s', async (role) => {
    db.update(users).set({ role }).run()
    expect((await api.request('/api/dev/tables')).status).toBe(403)
    expect((await api.request('/api/dev/tables/users')).status).toBe(403)
  })
})
