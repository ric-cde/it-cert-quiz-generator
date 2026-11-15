import { dirname, join } from 'node:path'
import {
  BACKUP_SERVICE,
  CURRENT_LINK,
  LISTEN_HOST,
  LIVE_ADDRESS,
  LIVE_DATA_DIR,
  LIVE_PORT,
  PREVIEW_ADDRESS,
} from './paths'

/**
 * The systemd user units that run the app on the eq14. `node` is the full path of the Node that
 * installed the packages: services don't read the shell's fnm setup, and better-sqlite3 is built
 * for one Node version, so the live copy must keep using that exact one until the next release.
 */
export function unitFiles({ node, repoDir }: { node: string; repoDir: string }): Record<string, string> {
  const binDir = dirname(node)
  const path = `${binDir}:/usr/local/bin:/usr/bin:/bin`

  return {
    'quiz.service': `[Unit]
Description=IT cert quiz, live copy (${LIVE_ADDRESS})
After=network.target

[Service]
Type=simple
WorkingDirectory=${CURRENT_LINK}
ExecStart=${node} dist/server/index.js
Environment=NODE_ENV=production
Environment=HOST=${LISTEN_HOST}
Environment=PORT=${LIVE_PORT}
Environment=DATA_DIR=${LIVE_DATA_DIR}
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
`,

    'quiz-preview.service': `[Unit]
Description=IT cert quiz, preview of the code being worked on (${PREVIEW_ADDRESS})
After=network.target

[Service]
Type=simple
WorkingDirectory=${repoDir}
ExecStart=${join(binDir, 'npm')} run dev
Environment=HOST=${LISTEN_HOST}
Environment=PATH=${path}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`,

    [BACKUP_SERVICE]: `[Unit]
Description=IT cert quiz, nightly database backup

[Service]
Type=oneshot
WorkingDirectory=${CURRENT_LINK}
ExecStart=${node} dist/backup.js nightly
Environment=DATA_DIR=${LIVE_DATA_DIR}
`,

    'quiz-backup.timer': `[Unit]
Description=IT cert quiz, nightly database backup at 03:30

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true

[Install]
WantedBy=timers.target
`,
  }
}
