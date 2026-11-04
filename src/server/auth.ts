import { asc } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import type { Role } from '../shared/domain'
import type { Db } from './db'
import { users } from './db/schema'

export type CurrentUser = typeof users.$inferSelect
export type AuthEnv = { Variables: { user: CurrentUser } }

/** In v1 everyone is the seeded admin. Real login later replaces only this middleware. */
export function resolveUser(db: Db) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    c.set('user', db.select().from(users).orderBy(asc(users.id)).limit(1).get()!)
    await next()
  })
}

/** Add to every route that needs a particular role. Needs `resolveUser` to have run first. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    if (!roles.includes(c.get('user').role)) return c.json({ error: 'Forbidden' }, 403)
    await next()
  })
}
