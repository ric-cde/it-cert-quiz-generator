import { eq } from 'drizzle-orm'
import { DEFAULT_PRIORITY_WEIGHTS, DEFAULT_QUIZ_DEFAULTS } from '../shared/domain'
import type { Db } from './db'
import { settings } from './db/schema'

export function getSettings(db: Db, userId: number) {
  const existing = db.select().from(settings).where(eq(settings.userId, userId)).get()
  if (existing) return existing
  return db
    .insert(settings)
    .values({ userId, priorityWeights: DEFAULT_PRIORITY_WEIGHTS, quizDefaults: DEFAULT_QUIZ_DEFAULTS })
    .returning()
    .get()
}

export function updateSettings(db: Db, userId: number, changes: { syntaxHighlighting: boolean }) {
  getSettings(db, userId)
  return db.update(settings).set(changes).where(eq(settings.userId, userId)).returning().get()!
}
