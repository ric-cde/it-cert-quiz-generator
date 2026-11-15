import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { copyDatabase } from './backup'
import { LIVE_DB, PREVIEW_SERVICE } from './paths'
import { assertEq14, isActive, systemctl } from './system'

// `npm run dev:refresh-db`: replaces the preview's dev database (data/dev) with a copy of the
// live one, so the preview has your latest questions. The old dev database is kept beside it
// as quiz.db.before-refresh. The live database is only read.

assertEq14()

const devDir = join(process.cwd(), 'data', 'dev')
const devDb = join(devDir, 'quiz.db')

if (!existsSync(LIVE_DB)) {
  console.error(`No live database at ${LIVE_DB}.`)
  process.exit(1)
}

// The preview holds the dev database open, so it stops while the file is swapped.
const wasRunning = isActive(PREVIEW_SERVICE)
if (wasRunning) systemctl('stop', PREVIEW_SERVICE)

try {
  mkdirSync(devDir, { recursive: true, mode: 0o700 })
  const fresh = `${devDb}.new`
  rmSync(fresh, { force: true })
  await copyDatabase(LIVE_DB, fresh)
  // The -wal file can hold recent changes, so it moves with the old copy rather than being deleted.
  for (const extra of ['', '-wal', '-shm']) {
    rmSync(`${devDb}.before-refresh${extra}`, { force: true })
    if (existsSync(`${devDb}${extra}`)) renameSync(`${devDb}${extra}`, `${devDb}.before-refresh${extra}`)
  }
  renameSync(fresh, devDb)
  console.log(`Dev database replaced with a copy of the live one (old copy: ${devDb}.before-refresh).`)
} finally {
  if (wasRunning) systemctl('start', PREVIEW_SERVICE)
}
