import { describe, expect, it } from 'vitest'
import { unitFiles } from './units'

const node = '/home/ric/.local/share/fnm/node-versions/v24.22.3/installation/bin/node'
const units = unitFiles({ node, repoDir: '/home/ric/projects/it-cert-quiz-generator' })

describe('unitFiles', () => {
  it('defines the live copy, the preview and the nightly backup', () => {
    expect(Object.keys(units).sort()).toEqual([
      'quiz-backup.service',
      'quiz-backup.timer',
      'quiz-preview.service',
      'quiz.service',
    ])
  })

  it('runs the live copy from the current release, on localhost only, with data outside the repo', () => {
    const live = units['quiz.service']
    expect(live).toMatch(/^WorkingDirectory=.*\/apps\/quiz\/current$/m)
    expect(live).toContain(`ExecStart=${node} dist/server/index.js`)
    expect(live).toContain('Environment=HOST=127.0.0.1')
    expect(live).toContain('Environment=PORT=3000')
    expect(live).toMatch(/^Environment=DATA_DIR=.*\/quiz-data$/m)
    expect(live).toContain('Restart=always')
    expect(live).toContain('WantedBy=default.target')
  })

  it('runs the preview from the repo with the same Node, on localhost only', () => {
    const preview = units['quiz-preview.service']
    expect(preview).toContain('WorkingDirectory=/home/ric/projects/it-cert-quiz-generator')
    expect(preview).toContain(
      'ExecStart=/home/ric/.local/share/fnm/node-versions/v24.22.3/installation/bin/npm run dev',
    )
    expect(preview).toContain('Environment=HOST=127.0.0.1')
    expect(preview).toMatch(
      /^Environment=PATH=\/home\/ric\/.local\/share\/fnm\/node-versions\/v24.22.3\/installation\/bin:/m,
    )
  })

  it('backs up nightly from the release, catching up after the server was off', () => {
    expect(units['quiz-backup.service']).toContain(`ExecStart=${node} dist/backup.js nightly`)
    expect(units['quiz-backup.timer']).toContain('OnCalendar=*-*-* 03:30:00')
    expect(units['quiz-backup.timer']).toContain('Persistent=true')
  })
})
