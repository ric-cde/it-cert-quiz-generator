import { Hono } from 'hono'
import type { Health } from '../shared/health'
import type { Db } from './db'
import { users } from './db/schema'

/** All API routes. Routes are chained so the `hc` client can infer their types. */
export function createApi(db: Db) {
  return new Hono().get('/api/health', (c) => {
    const health: Health = {
      status: 'ok',
      users: db.select({ name: users.name, role: users.role }).from(users).all(),
    }
    return c.json(health)
  })
}

export type AppType = ReturnType<typeof createApi>
