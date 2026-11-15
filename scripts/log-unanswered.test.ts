import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { appendQuestions, collectStrings, extractQuestions } from './log-unanswered'

describe('extractQuestions', () => {
  it('reads the bullets under the heading and stops at the next section', () => {
    const summary = [
      '## Current work',
      '- Stage 7',
      '',
      '## Unanswered questions',
      '',
      '- import | Should a duplicate bank replace the old one?',
      '* quiz | Keep the timer on retries?',
      '',
      '## Next step',
      '- Wait for start',
    ].join('\n')

    expect(extractQuestions(summary)).toEqual([
      'import | Should a duplicate bank replace the old one?',
      'quiz | Keep the timer on retries?',
    ])
  })

  it('accepts a numbered or bold heading', () => {
    expect(extractQuestions('9. Unanswered questions:\n- a | b?')).toEqual(['a | b?'])
    expect(extractQuestions('**Unanswered questions**\n- a | b?')).toEqual(['a | b?'])
  })

  it('returns nothing when there are none, or no heading', () => {
    expect(extractQuestions('## Unanswered questions\n- None')).toEqual([])
    expect(extractQuestions('The unanswered questions are below\n- a | b?')).toEqual([])
  })
})

describe('collectStrings', () => {
  it('finds strings at any depth', () => {
    expect(collectStrings({ a: 'x', b: [{ c: 'y' }, 1, null] })).toEqual(['x', 'y'])
  })
})

describe('appendQuestions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unanswered-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('creates the file, dates each line and skips questions already logged', () => {
    const file = join(dir, 'docs/unanswered.md')

    expect(appendQuestions(file, ['a | first?', 'a | first?'], '2026-11-15')).toBe(1)
    expect(appendQuestions(file, ['a | first?', 'b | second?'], '2026-11-16')).toBe(1)
    expect(readFileSync(file, 'utf8')).toBe('2026-11-15 | a | first?\n2026-11-16 | b | second?\n')
  })

  it('starts on a new line when the file does not end with one', () => {
    const file = join(dir, 'no-newline.md')
    writeFileSync(file, '2026-11-01 | a | old?')

    appendQuestions(file, ['b | new?'], '2026-11-15')
    expect(readFileSync(file, 'utf8')).toBe('2026-11-01 | a | old?\n2026-11-15 | b | new?\n')
  })
})
