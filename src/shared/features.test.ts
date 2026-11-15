import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FEATURES,
  FEATURE_KEYS,
  FEATURES,
  featureChangesSchema,
  featureGroups,
  resolveFeatures,
} from './features'

describe('feature flags', () => {
  it('gives every flag its default when nothing is saved', () => {
    expect(resolveFeatures(undefined)).toEqual(DEFAULT_FEATURES)
    expect(resolveFeatures({})).toEqual(DEFAULT_FEATURES)
    for (const key of FEATURE_KEYS) expect(DEFAULT_FEATURES[key]).toBe(FEATURES[key].default)
  })

  it('uses what was saved, and ignores flags that no longer exist or are not true or false', () => {
    const flags = resolveFeatures({ sourceIcons: false, retired: true, shortcutHints: 'no' })
    expect(flags.sourceIcons).toBe(false)
    expect(flags.shortcutHints).toBe(DEFAULT_FEATURES.shortcutHints)
    expect(flags).not.toHaveProperty('retired')
  })

  it('groups the flags for the Settings page, keeping every flag exactly once', () => {
    const groups = featureGroups()
    expect(groups.flatMap((group) => group.keys).sort()).toEqual([...FEATURE_KEYS].sort())
    expect(new Set(groups.map((group) => group.group)).size).toBe(groups.length)
  })

  it('accepts changes to known flags only', () => {
    expect(featureChangesSchema.safeParse({ sourceIcons: false }).success).toBe(true)
    expect(featureChangesSchema.safeParse({}).success).toBe(true)
    expect(featureChangesSchema.safeParse({ madeUp: true }).success).toBe(false)
    expect(featureChangesSchema.safeParse({ sourceIcons: 'off' }).success).toBe(false)
  })
})
