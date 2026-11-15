import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { LIVE_DATA_DIR } from './paths'

/** Backups of each kind that are kept; older ones are deleted after each new backup. */
export const BACKUPS_KEPT = 14

export const BACKUP_KINDS = ['nightly', 'release', 'manual'] as const
export type BackupKind = (typeof BACKUP_KINDS)[number]

const NAME = /^quiz-(\d{8}-\d{6})-([a-z]+)\.db$/

/** Local time as `20261115-033000`, which sorts oldest to newest. */
export function timestamp(now: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}

/** `quiz-20261115-033000-nightly.db`: sorts by time, and says why it was taken. */
export function backupName(kind: BackupKind, now: Date) {
  return `quiz-${timestamp(now)}-${kind}.db`
}

/**
 * Copies the database into one self-contained file with SQLite's online backup, which is safe
 * while the server is writing to it (copying the file and its -wal by hand is not).
 */
export async function copyDatabase(from: string, to: string) {
  const db = new Database(from, { readonly: true, fileMustExist: true })
  try {
    await db.backup(to)
    chmodSync(to, 0o600)
  } finally {
    db.close()
  }
}

/** Takes a backup, then keeps only the newest {@link BACKUPS_KEPT} of that kind. */
export async function backupDatabase({
  dbFile,
  backupDir,
  kind,
  now = new Date(),
  keep = BACKUPS_KEPT,
}: {
  dbFile: string
  backupDir: string
  kind: BackupKind
  now?: Date
  keep?: number
}) {
  mkdirSync(backupDir, { recursive: true, mode: 0o700 })
  const file = join(backupDir, backupName(kind, now))
  await copyDatabase(dbFile, file)
  const removed = pruneBackups(backupDir, kind, keep)
  return { file, removed }
}

/** Deletes all but the newest `keep` backups of one kind. Other files in the folder are left alone. */
export function pruneBackups(backupDir: string, kind: BackupKind, keep: number) {
  if (!existsSync(backupDir)) return []
  const ofKind = readdirSync(backupDir)
    .filter((name) => NAME.exec(name)?.[2] === kind)
    .sort()
    .reverse()
  const removed = ofKind.slice(keep)
  for (const name of removed) rmSync(join(backupDir, name), { force: true })
  return removed
}

// Run directly (`npm run backup`, the nightly timer, or the bundled copy in a release):
//   backup [nightly|release|manual]   backs up $DATA_DIR/quiz.db into $DATA_DIR/backups
async function main() {
  const kind = (process.argv[2] ?? 'manual') as BackupKind
  if (!BACKUP_KINDS.includes(kind)) {
    console.error(`Unknown backup kind "${kind}". Use one of: ${BACKUP_KINDS.join(', ')}`)
    process.exit(1)
  }
  const dataDir = process.env.DATA_DIR ?? LIVE_DATA_DIR
  const dbFile = join(dataDir, 'quiz.db')
  if (!existsSync(dbFile)) {
    console.error(`No database at ${dbFile}, so nothing to back up.`)
    process.exit(1)
  }
  const { file, removed } = await backupDatabase({ dbFile, backupDir: join(dataDir, 'backups'), kind })
  console.log(`Backed up to ${file}${removed.length ? ` (removed ${removed.length} older)` : ''}`)
}

const entry = process.argv[1] ?? ''
if (/backup\.(ts|js)$/.test(entry)) await main()
