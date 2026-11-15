import { existsSync } from 'node:fs'
import { BACKUP_TIMER, CURRENT_LINK, LIVE_SERVICE, PREVIEW_ADDRESS, PREVIEW_SERVICE, UNIT_DIR } from './paths'
import { assertEq14, isActive, systemctl, writeUnits } from './system'

// `npm run eq14:install`: sets up (or refreshes) the services on the eq14. Safe to run again.
// Run it after changing the default Node version, so the services follow.

assertEq14()

const changed = writeUnits(process.cwd())
console.log(changed.length ? `Updated ${changed.join(', ')} in ${UNIT_DIR}` : 'Unit files already up to date.')

systemctl('enable', LIVE_SERVICE, PREVIEW_SERVICE, BACKUP_TIMER)
systemctl('start', BACKUP_TIMER)

if (isActive(PREVIEW_SERVICE)) {
  if (changed.includes(PREVIEW_SERVICE)) systemctl('restart', PREVIEW_SERVICE)
} else systemctl('start', PREVIEW_SERVICE)
console.log(`Preview: ${PREVIEW_ADDRESS}`)

if (!existsSync(CURRENT_LINK)) {
  console.log('No live release yet: run `npm run deploy` to build one and start the live copy.')
} else if (changed.includes(LIVE_SERVICE) || !isActive(LIVE_SERVICE)) {
  systemctl('restart', LIVE_SERVICE)
  console.log('Live copy restarted.')
}
