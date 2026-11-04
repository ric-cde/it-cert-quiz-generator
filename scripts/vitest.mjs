import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

// A prompt opened at c:\ makes Vitest load itself twice, once per spelling of the drive letter,
// and then every test suite fails with "failed to find the runner". This has to happen before
// Vitest starts, because it fixes its paths before reading its config.
const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase())

const { status } = spawnSync(process.execPath, [resolve(cwd, 'node_modules/vitest/vitest.mjs'), ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
})

process.exit(status ?? 1)
