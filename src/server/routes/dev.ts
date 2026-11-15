import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { type AuthEnv, requireRole } from '../auth'
import type { Db } from '../db'
import { findTable, listTables, readTable, UnknownColumnError } from '../inspector'
import { viewerData } from '../question-viewer'
import { idParam, positiveId } from './params'

const tableQuery = z.object({
  page: positiveId.optional(),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).optional(),
})

/** The data inspector and the question viewer, for admins only. */
export const devRoutes = (db: Db) =>
  new Hono<AuthEnv>()
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
    .get('/api/dev/sources/:id/questions', requireRole('admin'), zValidator('param', idParam), (c) => {
      const data = viewerData(db, c.get('user').id, c.req.valid('param').id)
      return data ? c.json(data) : c.json({ error: 'No such source' }, 404)
    })
