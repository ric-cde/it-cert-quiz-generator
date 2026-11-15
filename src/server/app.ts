import { Hono } from 'hono'
import { type AuthEnv, resolveUser } from './auth'
import type { Db } from './db'
import { accountRoutes } from './routes/account'
import { devRoutes } from './routes/dev'
import { examRoutes } from './routes/exams'
import { importRoutes } from './routes/importing'
import { questionRoutes } from './routes/questions'
import { quizRoutes } from './routes/quizzes'
import { reviewRoutes } from './routes/review'

/**
 * All API routes, one group per area in `routes/`, so adding or removing an area is one line
 * here. Groups are chained so the `hc` client can infer their types.
 */
export function createApi(db: Db) {
  return new Hono<AuthEnv>()
    .use('/api/*', resolveUser(db))
    .route('/', accountRoutes(db))
    .route('/', importRoutes(db))
    .route('/', reviewRoutes(db))
    .route('/', examRoutes(db))
    .route('/', quizRoutes(db))
    .route('/', questionRoutes(db))
    .route('/', devRoutes(db))
}

export type AppType = ReturnType<typeof createApi>
