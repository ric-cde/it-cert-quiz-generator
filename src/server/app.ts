import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Health } from '../shared/health'
import { answerBody, createQuizBody, flagBody, nextBody, revealBody } from '../shared/quiz'
import { reviewDecisionSchema } from '../shared/review'
import { type AuthEnv, requireRole, resolveUser } from './auth'
import { commitImport, deleteSource, listSources, previewImport } from './bank-import'
import type { Db } from './db'
import { users } from './db/schema'
import { findTable, listTables, readTable, UnknownColumnError } from './inspector'
import {
  answerQuestion,
  createQuiz,
  finishQuiz,
  flagQuestion,
  getQuizState,
  listStartOptions,
  nextQuestion,
  revealAnswer,
  unflagQuestion,
} from './quiz'
import { listToReview, resolveReview } from './review'
import { getSettings, updateSettings } from './settings'

const settingsChanges = z.strictObject({ syntaxHighlighting: z.boolean() })

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
})
const idParam = z.object({ id: z.string().regex(/^[1-9]\d*$/).transform(Number) })

const reviewQuery = z.object({ sourceId: z.string().regex(/^[1-9]\d*$/).transform(Number).optional() })

const tableQuery = z.object({
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .optional(),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).optional(),
})

const QUIZ_FAILURE_STATUS = { 'not-found': 404, conflict: 409, invalid: 400 } as const

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
    .get('/api/quizzes/start-options', (c) => c.json(listStartOptions(db, c.get('user').id)))
    .post('/api/quizzes', zValidator('json', createQuizBody), (c) => {
      const created = createQuiz(db, c.get('user').id, c.req.valid('json'))
      return created.ok ? c.json({ id: created.id }, 201) : c.json({ error: created.error }, QUIZ_FAILURE_STATUS[created.error])
    })
    .get('/api/quizzes/:id', zValidator('param', idParam), (c) => {
      const state = getQuizState(db, c.get('user').id, c.req.valid('param').id)
      return state ? c.json(state) : c.json({ error: 'No such quiz' }, 404)
    })
    .post('/api/quizzes/:id/answer', zValidator('param', idParam), zValidator('json', answerBody), (c) => {
      const outcome = answerQuestion(db, c.get('user').id, c.req.valid('param').id, c.req.valid('json'))
      return outcome.ok ? c.json(outcome.state) : c.json({ error: outcome.error }, QUIZ_FAILURE_STATUS[outcome.error])
    })
    .post('/api/quizzes/:id/reveal', zValidator('param', idParam), zValidator('json', revealBody), (c) => {
      const outcome = revealAnswer(db, c.get('user').id, c.req.valid('param').id, c.req.valid('json'))
      return outcome.ok ? c.json(outcome.state) : c.json({ error: outcome.error }, QUIZ_FAILURE_STATUS[outcome.error])
    })
    .post('/api/quizzes/:id/next', zValidator('param', idParam), zValidator('json', nextBody), (c) => {
      const outcome = nextQuestion(db, c.get('user').id, c.req.valid('param').id, c.req.valid('json').questionId)
      return outcome.ok ? c.json(outcome.state) : c.json({ error: outcome.error }, QUIZ_FAILURE_STATUS[outcome.error])
    })
    .post('/api/quizzes/:id/finish', zValidator('param', idParam), (c) => {
      const outcome = finishQuiz(db, c.get('user').id, c.req.valid('param').id)
      return outcome.ok ? c.json(outcome.state) : c.json({ error: outcome.error }, QUIZ_FAILURE_STATUS[outcome.error])
    })
    .put('/api/questions/:id/flag', zValidator('param', idParam), zValidator('json', flagBody), (c) =>
      flagQuestion(db, c.req.valid('param').id, c.req.valid('json').reason)
        ? c.json({ ok: true })
        : c.json({ error: 'No such question' }, 404),
    )
    .delete('/api/questions/:id/flag', zValidator('param', idParam), (c) =>
      unflagQuestion(db, c.req.valid('param').id) ? c.json({ ok: true }) : c.json({ error: 'No such question' }, 404),
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
