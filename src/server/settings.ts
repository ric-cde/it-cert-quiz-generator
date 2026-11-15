import { eq } from 'drizzle-orm'
import { DEFAULT_PRIORITY_WEIGHTS, DEFAULT_QUIZ_DEFAULTS, type OptionOrder } from '../shared/domain'
import { type FeatureChanges, type FeatureKey, resolveFeatures } from '../shared/features'
import type { Db } from './db'
import { settings } from './db/schema'

export type SettingsChanges = { syntaxHighlighting?: boolean; optionOrder?: OptionOrder; features?: FeatureChanges }

/** The user's row, created with the defaults the first time it's needed. */
function settingsRow(db: Db, userId: number) {
  const existing = db.select().from(settings).where(eq(settings.userId, userId)).get()
  if (existing) return existing
  return db
    .insert(settings)
    .values({ userId, priorityWeights: DEFAULT_PRIORITY_WEIGHTS, quizDefaults: DEFAULT_QUIZ_DEFAULTS })
    .returning()
    .get()
}

/** The user's settings, with every feature flag filled in. */
export function getSettings(db: Db, userId: number) {
  const row = settingsRow(db, userId)
  return { ...row, features: resolveFeatures(row.features) }
}

/** Changes only what's given. Feature flags are saved only once changed, so the rest follow their defaults. */
export function updateSettings(db: Db, userId: number, changes: SettingsChanges) {
  const row = settingsRow(db, userId)
  db.update(settings)
    .set({
      ...(changes.syntaxHighlighting === undefined ? {} : { syntaxHighlighting: changes.syntaxHighlighting }),
      ...(changes.optionOrder === undefined ? {} : { optionOrder: changes.optionOrder }),
      ...(changes.features === undefined ? {} : { features: { ...row.features, ...changes.features } }),
    })
    .where(eq(settings.userId, userId))
    .run()
  return getSettings(db, userId)
}

/** For a feature the server must enforce, such as one that calls Claude. */
export function isFeatureOn(db: Db, userId: number, key: FeatureKey) {
  return getSettings(db, userId).features[key]
}
