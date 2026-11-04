import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Health } from '../shared/health'
import { type AuthEnv, requireRole, resolveUser } from './auth'
import type { Db } from './db'
import { users } from './db/schema'
import { findTable, listTables, readTable, UnknownColumnError } from './inspector'
import { getSettings, updateSettings } from './settings'

const settingsChanges = z.strictObject({ syntaxHighlighting: z.boolean() })

const tableQuery = z.object({
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .optional(),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).optional(),
})

/** All API routes. Routes are chained so the `hc` client can infer their types. */
export function createApi(db: Db) {
  return new Hono<AuthEnv>()
    .use('/api/*', resolveUser(db))
    .get('/api/health', (c) => {
      const health: Health = {
        status: 'ok',
        users: db.select({ name: users.name, role: users.role }).from(users).all(),
      }
      return c.json(health)
    })
    .get('/api/me', (c) => {
      const { id, name, role } = c.get('user')
      return c.json({ id, name, role })
    })
    .get('/api/settings', (c) => c.json(getSettings(db, c.get('user').id)))
    .patch('/api/settings', zValidator('json', settingsChanges), (c) =>
      c.json(updateSettings(db, c.get('user').id, c.req.valid('json'))),
    )
    .get('/api/dev/tables', requireRole('admin'), (c) => c.json(listTables(db)))
    .get('/api/dev/tables/:name', requireRole('admin'), zValidator('query', tableQuery), (c) => {
      const table = findTable(c.req.param('name'))
      if (!table) return c.json({ error: 'No such table' }, 404)

      const { page = 1, sort, dir = 'asc' } = c.req.valid('query')
      try {
        return c.json(readTable(db, table, { page, sort, dir }))
      } catch (error) {
        if (error instanceof UnknownColumnError) return c.json({ error: 'No such column' }, 400)
        throw error
      }
    })
}

export type AppType = ReturnType<typeof createApi>
