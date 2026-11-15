import { spawnSync, type SpawnSyncOptions } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { UNIT_DIR } from './paths'
import { unitFiles } from './units'

/** Runs a command with its output shown, and stops everything if it fails. */
export function run(command: string, args: string[], options: SpawnSyncOptions = {}) {
  const { status } = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${status})`)
}

/** Runs a command quietly and returns its output, or null if it failed. */
export function capture(command: string, args: string[], options: SpawnSyncOptions = {}) {
  const { status, stdout } = spawnSync(command, args, { encoding: 'utf8', ...options })
  return status === 0 ? String(stdout).trim() : null
}

export const systemctl = (...args: string[]) => run('systemctl', ['--user', ...args])
export const isActive = (unit: string) => capture('systemctl', ['--user', 'is-active', unit]) === 'active'

/** npm from the same Node that is running this script, so packages match the services' Node. */
export function npm(args: string[], cwd: string) {
  const binDir = dirname(process.execPath)
  run(join(binDir, 'npm'), args, { cwd, env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` } })
}

export function assertEq14() {
  if (process.platform !== 'linux') {
    console.error('This command sets up the eq14 server and only runs on Linux.')
    process.exit(1)
  }
}

/** Writes the unit files (only those that changed) and reloads systemd. Returns the changed names. */
export function writeUnits(repoDir: string) {
  mkdirSync(UNIT_DIR, { recursive: true })
  const changed: string[] = []
  for (const [name, text] of Object.entries(unitFiles({ node: process.execPath, repoDir }))) {
    const file = join(UNIT_DIR, name)
    if (existsSync(file) && readFileSync(file, 'utf8') === text) continue
    writeFileSync(file, text)
    changed.push(name)
  }
  if (changed.length) systemctl('daemon-reload')
  return changed
}
