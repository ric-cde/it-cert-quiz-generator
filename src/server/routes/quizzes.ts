import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { answerBody, createQuizBody, nextBody, revealBody } from '../../shared/quiz'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import {
  answerQuestion,
  createQuiz,
  finishQuiz,
  getQuizState,
  nextQuestion,
  retryMissed,
  revealAnswer,
  reviewQuiz,
} from '../quiz'
import { idParam, QUIZ_FAILURE_STATUS } from './params'

/** Starting, taking, finishing and reviewing a quiz. */
export const quizRoutes = (db: Db) =>
  new Hono<AuthEnv>()
    .post('/api/quizzes', zValidator('json', createQuizBody), (c) => {
      const created = createQuiz(db, c.get('user').id, c.req.valid('json'))
      return created.ok
        ? c.json({ id: created.id }, 201)
        : c.json({ error: created.error }, QUIZ_FAILURE_STATUS[created.error])
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
    .get('/api/quizzes/:id/review', zValidator('param', idParam), (c) => {
      const entries = reviewQuiz(db, c.get('user').id, c.req.valid('param').id)
      return typeof entries === 'string' ? c.json({ error: entries }, QUIZ_FAILURE_STATUS[entries]) : c.json(entries)
    })
    .post('/api/quizzes/:id/retry', zValidator('param', idParam), (c) => {
      const created = retryMissed(db, c.get('user').id, c.req.valid('param').id)
      return created.ok
        ? c.json({ id: created.id }, 201)
        : c.json({ error: created.error }, QUIZ_FAILURE_STATUS[created.error])
    })
    .post('/api/quizzes/:id/finish', zValidator('param', idParam), (c) => {
      const outcome = finishQuiz(db, c.get('user').id, c.req.valid('param').id)
      return outcome.ok ? c.json(outcome.state) : c.json({ error: outcome.error }, QUIZ_FAILURE_STATUS[outcome.error])
    })
