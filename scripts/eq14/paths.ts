import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_PORT } from '../../src/shared/ports'

// Where everything lives on the eq14. The live copy and its data sit outside the repo, so work
// on the code (and the dev database in data/dev) can never touch real study progress.

const home = homedir()

/** The live copy: one folder per release, with `current` pointing at the one running. */
export const APP_DIR = join(home, 'apps', 'quiz')
export const RELEASES_DIR = join(APP_DIR, 'releases')
export const CURRENT_LINK = join(APP_DIR, 'current')

/** Real study data, and the backups of it. */
export const LIVE_DATA_DIR = join(home, 'quiz-data')
export const LIVE_DB = join(LIVE_DATA_DIR, 'quiz.db')
export const BACKUP_DIR = join(LIVE_DATA_DIR, 'backups')

/** systemd user units. */
export const UNIT_DIR = join(home, '.config', 'systemd', 'user')
export const LIVE_SERVICE = 'quiz.service'
export const PREVIEW_SERVICE = 'quiz-preview.service'
export const BACKUP_SERVICE = 'quiz-backup.service'
export const BACKUP_TIMER = 'quiz-backup.timer'

/** The live copy listens here, and Tailscale Serve publishes it as https://…:8443. */
export const LIVE_PORT = DEFAULT_PORT
export const LISTEN_HOST = '127.0.0.1'

export const LIVE_ADDRESS = 'https://eq14.codlet-fence.ts.net:8443'
export const PREVIEW_ADDRESS = 'https://eq14.codlet-fence.ts.net:8444'

/** How many releases to keep for rolling back, counting the one running. */
export const RELEASES_KEPT = 3
