import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { healthSchema } from '../shared/health'
import { createApi } from './app'
import { openDb } from './db'

describe('GET /api/health', () => {
  it('reads the seeded admin from a freshly migrated database', async () => {
    const res = await createApi(openDb(':memory:')).request('/api/health')

    expect(res.status).toBe(200)
    expect(healthSchema.parse(await res.json())).toEqual({
      status: 'ok',
      users: [{ name: 'Admin', role: 'admin' }],
    })
  })
})

describe('openDb', () => {
  it('creates missing folders and does not add a second admin when reopened', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'quiz-'))
    const file = join(dir, 'nested', 'quiz.db')

    openDb(file).$client.close()
    const db = openDb(file)
    const res = await createApi(db).request('/api/health')
    db.$client.close()
    rmSync(dir, { recursive: true, force: true })

    expect(healthSchema.parse(await res.json()).users).toHaveLength(1)
  })
})
