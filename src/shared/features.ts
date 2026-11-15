import { z } from 'zod'

/**
 * Feature flags: extra behaviour beyond the core spec, each of which can be turned off in
 * Settings. The core spec itself is never behind a flag.
 *
 * To add a flag, add an entry here. It appears on the Settings page by itself, defaults to
 * `default` for everyone who hasn't changed it, and needs no migration. Read it with `useFeature`
 * in the browser, or `isFeatureOn` on the server for anything the server must enforce. When a
 * feature is settled for good, delete its flag and the code paths it guarded.
 */

export type FeatureDefinition = {
  /** The heading it's listed under on the Settings page. */
  group: string
  label: string
  /** One sentence on what it does, shown under the label. */
  description: string
  default: boolean
}

export const FEATURES = {
  sourceIcons: {
    group: 'Everywhere',
    label: 'Source icons',
    description: 'An animal beside each source, so sources are easy to tell apart at a glance.',
    default: true,
  },
  examIcons: {
    group: 'Everywhere',
    label: 'Exam icons',
    description: "The logo of an exam's subject beside its name, such as Java's or OutSystems'.",
    default: true,
  },
  shortcutHints: {
    group: 'Everywhere',
    label: 'Keyboard shortcut hints',
    description: 'Keycaps such as Enter and R on the buttons they press. The shortcuts work either way.',
    default: true,
  },
  starredQuestions: {
    group: 'Everywhere',
    label: 'Starred questions',
    description: 'A star on each question in a quiz, and a Starred filter on the take-exam screen.',
    default: true,
  },
  difficultyButtons: {
    group: 'Quiz',
    label: 'Difficulty buttons (experimental)',
    description:
      'After each answer, the difficulty of the question with -1 and +1 buttons to change it. The up and down arrow keys do the same.',
    default: true,
  },
  questionStrip: {
    group: 'Take exam',
    label: 'Question strip',
    description: 'A square for each question the quiz will ask, coloured by how you did on it, beside the live count.',
    default: true,
  },
  tileSquares: {
    group: 'Take exam',
    label: 'Question squares on tiles',
    description: 'A tiny square for each question on a tile, in place of its progress bar.',
    default: true,
  },
  statusCounts: {
    group: 'Take exam',
    label: 'Counts on the status options',
    description: 'How many questions each status would give, in the corner of each option.',
    default: true,
  },
} as const satisfies Record<string, FeatureDefinition>

export type FeatureKey = keyof typeof FEATURES
export type FeatureFlags = Record<FeatureKey, boolean>

export const FEATURE_KEYS = Object.keys(FEATURES) as [FeatureKey, ...FeatureKey[]]

export const DEFAULT_FEATURES = Object.fromEntries(
  FEATURE_KEYS.map((key) => [key, FEATURES[key].default]),
) as FeatureFlags

/**
 * Every flag's value from what's saved, which holds only the flags someone has changed. Anything
 * else takes its default, and a saved flag that no longer exists is ignored.
 */
export function resolveFeatures(saved: Readonly<Record<string, unknown>> | null | undefined): FeatureFlags {
  const flags = { ...DEFAULT_FEATURES }
  for (const key of FEATURE_KEYS) {
    const value = saved?.[key]
    if (typeof value === 'boolean') flags[key] = value
  }
  return flags
}

/** The groups on the Settings page, in the order their first flag appears above, each with its flags. */
export function featureGroups(): { group: string; keys: FeatureKey[] }[] {
  const groups = new Map<string, FeatureKey[]>()
  for (const key of FEATURE_KEYS) {
    const { group } = FEATURES[key]
    groups.set(group, [...(groups.get(group) ?? []), key])
  }
  return [...groups].map(([group, keys]) => ({ group, keys }))
}

/** A change to some flags, as sent to the server. Unknown flags are rejected. */
export const featureChangesSchema = z.partialRecord(z.enum(FEATURE_KEYS), z.boolean())
export type FeatureChanges = z.infer<typeof featureChangesSchema>
