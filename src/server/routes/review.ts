import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { reviewDecisionSchema } from '../../shared/review'
import { type AuthEnv, requireRole } from '../auth'
import type { Db } from '../db'
import { listToReview, resolveReview } from '../review'
import { idParam, positiveId } from './params'

const reviewQuery = z.object({ sourceId: positiveId.optional() })

/** Questions that came in with a doubt, and settling them. */
export const reviewRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .get('/api/review', requireRole('admin', 'editor'), zValidator('query', reviewQuery), (c) =>
      c.json(listToReview(db, c.req.valid('query').sourceId)),
    )
    .post(
      '/api/review/:id',
      requireRole('admin', 'editor'),
      zValidator('param', idParam),
      zValidator('json', reviewDecisionSchema),
      (c) => {
        const outcome = resolveReview(db, c.req.valid('param').id, c.req.valid('json'))
        if (outcome === 'not-found') return c.json({ error: 'No such question to review' }, 404)
        if (outcome === 'invalid-answer') return c.json({ error: 'That answer does not fit this question' }, 400)
        return c.json({ ok: true })
      },
    )
