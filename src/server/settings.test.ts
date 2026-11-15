import { beforeEach, describe, expect, it } from 'vitest'
import { createApi } from './app'
import { type Db, openDb } from './db'
import { settings, userExams } from './db/schema'
import { DEFAULT_FEATURES } from '../shared/features'
import { isFeatureOn } from './settings'

let db: Db
let api: ReturnType<typeof createApi>

beforeEach(() => {
  db = openDb(':memory:')
  api = createApi(db)
})

const patch = (body: unknown) =>
  api.request('/api/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('/api/settings', () => {
  it('has syntax highlighting on by default', async () => {
    const res = await api.request('/api/settings')
    expect(await res.json()).toMatchObject({ syntaxHighlighting: true })
  })

  it('saves a change, leaving other settings alone', async () => {
    const before = db.select().from(settings).get()!

    const res = await patch({ syntaxHighlighting: false })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ syntaxHighlighting: false })
    expect(await (await api.request('/api/settings')).json()).toMatchObject({ syntaxHighlighting: false })
    const after = db.select().from(settings).get()!
    expect(after.priorityWeights).toEqual(before.priorityWeights)
    expect(after.quizDefaults).toEqual(before.quizDefaults)
  })

  it('keeps lettered options in order by default, and saves another choice', async () => {
    expect(await (await api.request('/api/settings')).json()).toMatchObject({ optionOrder: 'labelled' })
    const res = await patch({ optionOrder: 'shuffle' })
    expect(await res.json()).toMatchObject({ optionOrder: 'shuffle', syntaxHighlighting: true })
    expect((await patch({ optionOrder: 'sometimes' })).status).toBe(400)
  })

  it('creates default settings if the user has none yet', async () => {
    db.delete(settings).run()
    expect(await (await api.request('/api/settings')).json()).toMatchObject({ userId: 1, syntaxHighlighting: true })
  })

  it.each([[{ syntaxHighlighting: 'no' }], [{}], [{ syntaxHighlighting: true, other: 1 }], [{ userId: 2 }]])(
    'rejects %j',
    async (body) => {
      expect((await patch(body)).status).toBe(400)
      expect(db.select().from(settings).get()!.syntaxHighlighting).toBe(true)
    },
  )
})

describe('feature flags in /api/settings', () => {
  it('lists every flag with its default when none has been changed', async () => {
    const res = await api.request('/api/settings')
    expect((await res.json()).features).toEqual(DEFAULT_FEATURES)
  })

  it('saves only the flags that change, leaving the rest to follow their defaults', async () => {
    const res = await patch({ features: { sourceIcons: false } })
    expect(res.status).toBe(200)
    expect((await res.json()).features).toEqual({ ...DEFAULT_FEATURES, sourceIcons: false })
    expect(db.select().from(settings).get()!.features).toEqual({ sourceIcons: false })

    await patch({ features: { shortcutHints: false } })
    expect(db.select().from(settings).get()!.features).toEqual({ sourceIcons: false, shortcutHints: false })
    expect(db.select().from(settings).get()!.syntaxHighlighting).toBe(true)
  })

  it('can change a flag and syntax highlighting together', async () => {
    const body = await (await patch({ syntaxHighlighting: false, features: { questionStrip: false } })).json()
    expect(body).toMatchObject({ syntaxHighlighting: false, features: { questionStrip: false } })
  })

  it.each([[{ features: { madeUp: true } }], [{ features: { sourceIcons: 'off' } }], [{ features: [] }]])(
    'rejects %j',
    async (body) => {
      expect((await patch(body)).status).toBe(400)
      expect(db.select().from(settings).get()!.features).toEqual({})
    },
  )

  it('tells the server whether a flag is on', async () => {
    expect(isFeatureOn(db, 1, 'statusCounts')).toBe(DEFAULT_FEATURES.statusCounts)
    await patch({ features: { statusCounts: !DEFAULT_FEATURES.statusCounts } })
    expect(isFeatureOn(db, 1, 'statusCounts')).toBe(!DEFAULT_FEATURES.statusCounts)
  })
})

describe('user_exams', () => {
  it('starts with no exam marked as passed, and can record a pass', () => {
    expect(
      db
        .select()
        .from(userExams)
        .all()
        .every((row) => row.passedAt === null),
    ).toBe(true)

    const passedAt = new Date('2026-12-01T10:00:00.000Z')
    db.update(userExams).set({ passedAt }).run()
    expect(db.select().from(userExams).get()!.passedAt).toEqual(passedAt)
  })
})
