import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { isIconKey } from '../../shared/source-icons'
import { type AuthEnv, requireRole } from '../auth'
import { commitImport, previewImport } from '../bank-import'
import type { Db } from '../db'
import { deleteSource, listSources } from '../sources'
import { idParam } from './params'

// The bank itself is checked by the import, which reports every problem rather than the first.
const importPreviewBody = z.strictObject({ bank: z.unknown() })
const categoryChoice = z.union([
  z.strictObject({ map: z.number().int().positive() }),
  z.strictObject({ keep: z.literal(true) }),
])
const importCommitBody = z.strictObject({
  bank: z.unknown(),
  includeDuplicates: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  categoryChoices: z.record(z.string(), categoryChoice).optional(),
  icon: z.string().refine(isIconKey, 'Not one of the source icons').optional(),
})

/** Loading question banks, and the sources they make. */
export const importRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .post('/api/import/preview', requireRole('admin', 'editor'), zValidator('json', importPreviewBody), (c) =>
      c.json(previewImport(db, c.req.valid('json').bank)),
    )
    .post('/api/import/commit', requireRole('admin', 'editor'), zValidator('json', importCommitBody), (c) => {
      const { bank, ...options } = c.req.valid('json')
      const result = commitImport(db, bank, options)
      return result.ok ? c.json(result) : c.json(result, 422)
    })
    .get('/api/sources', requireRole('admin', 'editor'), (c) => c.json(listSources(db)))
    .delete('/api/sources/:id', requireRole('admin', 'editor'), zValidator('param', idParam), (c) => {
      const outcome = deleteSource(db, c.req.valid('param').id)
      if (outcome === 'not-found') return c.json({ error: 'No such source' }, 404)
      if (outcome === 'has-attempts') return c.json({ error: 'This source has attempts, so it was kept' }, 409)
      return c.json({ ok: true })
    })
