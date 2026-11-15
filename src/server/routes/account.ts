import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { OPTION_ORDERS } from '../../shared/domain'
import { featureChangesSchema } from '../../shared/features'
import type { Health } from '../../shared/health'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { users } from '../db/schema'
import { getSettings, updateSettings } from '../settings'

const settingsChanges = z
  .strictObject({
    syntaxHighlighting: z.boolean().optional(),
    optionOrder: z.enum(OPTION_ORDERS).optional(),
    features: featureChangesSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, 'Nothing to change')

/** Health, who you are, and your settings. */
export const accountRoutes = (db: Db) =>
  new Hono<AuthEnv>()
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
