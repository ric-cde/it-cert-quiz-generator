import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { difficultyBody, flagBody } from '../../shared/quiz'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { flagQuestion, unflagQuestion } from '../flags'
import { starQuestion, unstarQuestion } from '../stars'
import { adjustDifficulty } from '../tracking'
import { idParam } from './params'

/**
 * Flagging a question as bad or wrong, starring one for yourself, and moving your difficulty for
 * one by hand, from anywhere it's shown.
 */
export const questionRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .put('/api/questions/:id/flag', zValidator('param', idParam), zValidator('json', flagBody), (c) =>
      flagQuestion(db, c.req.valid('param').id, c.req.valid('json').reason)
        ? c.json({ ok: true })
        : c.json({ error: 'No such question' }, 404),
    )
    .delete('/api/questions/:id/flag', zValidator('param', idParam), (c) =>
      unflagQuestion(db, c.req.valid('param').id) ? c.json({ ok: true }) : c.json({ error: 'No such question' }, 404),
    )
    .put('/api/questions/:id/star', zValidator('param', idParam), (c) =>
      starQuestion(db, c.get('user').id, c.req.valid('param').id)
        ? c.json({ ok: true })
        : c.json({ error: 'No such question' }, 404),
    )
    .delete('/api/questions/:id/star', zValidator('param', idParam), (c) =>
      unstarQuestion(db, c.get('user').id, c.req.valid('param').id)
        ? c.json({ ok: true })
        : c.json({ error: 'No such question' }, 404),
    )
    .post('/api/questions/:id/difficulty', zValidator('param', idParam), zValidator('json', difficultyBody), (c) => {
      const difficulty = adjustDifficulty(db, c.get('user').id, c.req.valid('param').id, c.req.valid('json').change)
      return difficulty === null
        ? c.json({ error: 'This question has no difficulty yet' }, 409)
        : c.json({ difficulty })
    })
