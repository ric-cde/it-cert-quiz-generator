import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDb } from '../../src/server/db'
import { users } from '../../src/server/db/schema'
import { backupDatabase, backupName, pruneBackups } from './backup'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'quiz-backup-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('backupName', () => {
  it('puts the local time first, so names sort oldest to newest, and the kind last', () => {
    expect(backupName('nightly', new Date(2026, 10, 5, 3, 30, 7))).toBe('quiz-20261105-033007-nightly.db')
  })
})

describe('backupDatabase', () => {
  it('copies a database that is open and in WAL mode, including changes not yet checkpointed', async () => {
    const dbFile = join(dir, 'quiz.db')
    const live = openDb(dbFile)
    live.update(users).set({ name: 'Ric' }).run()

    const { file } = await backupDatabase({ dbFile, backupDir: join(dir, 'backups'), kind: 'release' })
    live.$client.close()

    const copy = openDb(file)
    expect(copy.select({ name: users.name }).from(users).all()).toEqual([{ name: 'Ric' }])
    copy.$client.close()
  })

  it.skipIf(process.platform === 'win32')('makes the backup readable by its owner only', async () => {
    const dbFile = join(dir, 'quiz.db')
    openDb(dbFile).$client.close()
    const { file } = await backupDatabase({ dbFile, backupDir: join(dir, 'backups'), kind: 'manual' })
    expect(statSync(file).mode & 0o777).toBe(0o600)
  })

  it('keeps only the newest backups of the same kind', async () => {
    const dbFile = join(dir, 'quiz.db')
    openDb(dbFile).$client.close()
    const backupDir = join(dir, 'backups')

    for (let day = 1; day <= 4; day++) {
      await backupDatabase({ dbFile, backupDir, kind: 'nightly', keep: 2, now: new Date(2026, 10, day) })
    }
    await backupDatabase({ dbFile, backupDir, kind: 'release', keep: 2, now: new Date(2026, 9, 1) })

    expect(readdirSync(backupDir).sort()).toEqual([
      'quiz-20261001-000000-release.db',
      'quiz-20261103-000000-nightly.db',
      'quiz-20261104-000000-nightly.db',
    ])
  })
})

describe('pruneBackups', () => {
  it('leaves files that are not backups alone', () => {
    writeFileSync(join(dir, 'notes.txt'), '')
    writeFileSync(join(dir, 'quiz-20261101-000000-nightly.db'), '')
    expect(pruneBackups(dir, 'nightly', 0)).toEqual(['quiz-20261101-000000-nightly.db'])
    expect(readdirSync(dir)).toEqual(['notes.txt'])
  })

  it('does nothing when there is no backup folder yet', () => {
    expect(pruneBackups(join(dir, 'missing'), 'nightly', 14)).toEqual([])
  })
})
