import { beforeEach, describe, expect, it } from 'vitest'
import { createApi } from './app'
import { type Db, openDb } from './db'
import { settings, userExams } from './db/schema'

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

describe('user_exams', () => {
  it('starts with no exam marked as passed, and can record a pass', () => {
    expect(db.select().from(userExams).all().every((row) => row.passedAt === null)).toBe(true)

    const passedAt = new Date('2026-12-01T10:00:00.000Z')
    db.update(userExams).set({ passedAt }).run()
    expect(db.select().from(userExams).get()!.passedAt).toEqual(passedAt)
  })
})
