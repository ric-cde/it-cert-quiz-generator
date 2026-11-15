import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { examStatusBody } from '../../shared/home'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { homeOverview, setExamStatus } from '../home'
import { practiceData } from '../selection'
import { idParam } from './params'

/** The home page, passing or abandoning an exam, and the take-exam screen's data. */
export const examRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .get('/api/home', (c) => c.json(homeOverview(db, c.get('user').id)))
    .put('/api/exams/:id/status', zValidator('param', idParam), zValidator('json', examStatusBody), (c) =>
      setExamStatus(db, c.get('user').id, c.req.valid('param').id, c.req.valid('json').status)
        ? c.json({ ok: true })
        : c.json({ error: 'No such exam' }, 404),
    )
    .get('/api/exams/:id/practice', zValidator('param', idParam), (c) => {
      const data = practiceData(db, c.get('user').id, c.req.valid('param').id)
      return data ? c.json(data) : c.json({ error: 'No such exam' }, 404)
    })
