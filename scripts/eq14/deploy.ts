import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { backupDatabase, timestamp } from './backup'
import {
  BACKUP_DIR,
  CURRENT_LINK,
  LISTEN_HOST,
  LIVE_ADDRESS,
  LIVE_DATA_DIR,
  LIVE_DB,
  LIVE_PORT,
  LIVE_SERVICE,
  RELEASES_DIR,
  RELEASES_KEPT,
} from './paths'
import { assertEq14, capture, npm, run, systemctl, writeUnits } from './system'

// `npm run deploy`: puts the code in this repo live at https://eq14.codlet-fence.ts.net:8443.
//
//  1. type checks and tests (skip with --skip-checks)
//  2. builds the app
//  3. makes a new release folder with the build and its production packages
//  4. backs up the live database
//  5. points `current` at the new release and restarts the live copy
//  6. checks the new release answers; if not, switches back to the previous one
//
// Study data lives in ~/quiz-data and is never touched, apart from the backup in step 4.

assertEq14()

const repo = process.cwd()
const skipChecks = process.argv.includes('--skip-checks')
const step = (text: string) => console.log(`\n▶ ${text}`)

interface ReleaseInfo {
  release: string
  commit: string | null
  uncommittedChanges: boolean
  node: string
  builtAt: string
}

function readInfo(dir: string): ReleaseInfo | null {
  const file = join(dir, 'RELEASE.json')
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as ReleaseInfo) : null
}

function sameFile(a: string, b: string) {
  return existsSync(a) && existsSync(b) && readFileSync(a, 'utf8') === readFileSync(b, 'utf8')
}

/** Points `current` at a release in one step, so the service never sees a half-made link. */
function pointCurrentAt(releaseDir: string) {
  const temp = `${CURRENT_LINK}.new`
  rmSync(temp, { force: true })
  symlinkSync(join('releases', basename(releaseDir)), temp)
  renameSync(temp, CURRENT_LINK)
}

/** Waits for the live copy to answer, and to be serving this release's build rather than the last. */
async function isHealthy(releaseDir: string, timeoutMs = 20_000) {
  const base = `http://${LISTEN_HOST}:${LIVE_PORT}`
  const expectedPage = readFileSync(join(releaseDir, 'dist/client/index.html'), 'utf8')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const health = await fetch(`${base}/api/health`)
      const page = await fetch(`${base}/`)
      if (health.ok && ((await health.json()) as { status?: string }).status === 'ok') {
        if (page.ok && (await page.text()) === expectedPage) return true
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

function pruneReleases(keep: string[]) {
  const all = readdirSync(RELEASES_DIR).sort().reverse()
  const removed = all.slice(RELEASES_KEPT).filter((name) => !keep.includes(name))
  for (const name of removed) rmSync(join(RELEASES_DIR, name), { recursive: true, force: true })
  return removed
}

async function main() {
  const previousDir = existsSync(CURRENT_LINK) ? realpathSync(CURRENT_LINK) : null

  if (skipChecks) console.log('Skipping type checks and tests (--skip-checks).')
  else {
    step('Type checks and tests')
    npm(['run', 'typecheck'], repo)
    npm(['test'], repo)
  }

  step('Building')
  npm(['run', 'build'], repo)

  const name = timestamp(new Date())
  const releaseDir = join(RELEASES_DIR, name)
  step(`Making release ${name}`)
  mkdirSync(releaseDir, { recursive: true })
  for (const item of ['dist', 'drizzle', 'package.json', 'package-lock.json', '.node-version']) {
    cpSync(join(repo, item), join(releaseDir, item), { recursive: true })
  }
  // The nightly backup runs from the release, so it doesn't depend on the code being worked on.
  run(
    join(repo, 'node_modules/.bin/esbuild'),
    [
      'scripts/eq14/backup.ts',
      '--bundle',
      '--platform=node',
      '--format=esm',
      '--packages=external',
      '--log-level=warning',
      `--outfile=${join(releaseDir, 'dist/backup.js')}`,
    ],
    { cwd: repo },
  )

  // Packages: reuse the previous release's when nothing about them has changed, as that's quicker.
  const previous = previousDir ? readInfo(previousDir) : null
  if (
    previousDir &&
    previous?.node === process.execPath &&
    sameFile(join(previousDir, 'package-lock.json'), join(releaseDir, 'package-lock.json')) &&
    existsSync(join(previousDir, 'node_modules'))
  ) {
    console.log('Packages unchanged, so copying them from the previous release.')
    run('cp', ['-a', join(previousDir, 'node_modules'), join(releaseDir, 'node_modules')])
  } else {
    console.log('Installing production packages.')
    npm(['ci', '--omit=dev', '--no-audit', '--no-fund'], releaseDir)
  }

  const info: ReleaseInfo = {
    release: name,
    commit: capture('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo }),
    uncommittedChanges: (capture('git', ['status', '--porcelain'], { cwd: repo }) ?? '') !== '',
    node: process.execPath,
    builtAt: new Date().toISOString(),
  }
  writeFileSync(join(releaseDir, 'RELEASE.json'), `${JSON.stringify(info, null, 2)}\n`)

  mkdirSync(LIVE_DATA_DIR, { recursive: true, mode: 0o700 })
  if (existsSync(LIVE_DB)) {
    step('Backing up the live database')
    const { file } = await backupDatabase({ dbFile: LIVE_DB, backupDir: BACKUP_DIR, kind: 'release' })
    console.log(file)
  } else {
    console.log(`\nNo live database yet at ${LIVE_DB}; the app will create a fresh one.`)
  }

  step('Switching the live copy to the new release')
  writeUnits(repo)
  pointCurrentAt(releaseDir)
  systemctl('enable', LIVE_SERVICE)
  systemctl('restart', LIVE_SERVICE)

  if (!(await isHealthy(releaseDir))) {
    console.error('\n✖ The new release did not start properly. Recent log:')
    run('journalctl', ['--user', '-u', LIVE_SERVICE, '-n', '30', '--no-pager'])
    if (previousDir) {
      pointCurrentAt(previousDir)
      systemctl('restart', LIVE_SERVICE)
      console.error(`\nSwitched back to ${basename(previousDir)}, which is live again.`)
      rmSync(releaseDir, { recursive: true, force: true })
    }
    process.exit(1)
  }

  const removed = pruneReleases([name, ...(previousDir ? [basename(previousDir)] : [])])
  console.log(`\n✔ Release ${name} is live at ${LIVE_ADDRESS}`)
  console.log(
    `  Commit ${info.commit ?? 'unknown'}${info.uncommittedChanges ? ', plus uncommitted changes' : ''}.` +
      (removed.length ? ` Removed ${removed.length} old release(s).` : ''),
  )
}

await main()
