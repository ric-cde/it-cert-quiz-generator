import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIR = 'src/client/themes'
const themes = readdirSync(DIR).filter((file) => file.endsWith('.css'))

const tokensIn = (file: string) => {
  const css = readFileSync(join(DIR, file), 'utf8')
  return [...new Set([...css.matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1]))].sort()
}

describe('themes', () => {
  it('theme.css points at a theme that exists', () => {
    const active = readFileSync('src/client/theme.css', 'utf8').match(/@import '\.\/themes\/(.+\.css)'/)?.[1]
    expect(active).toBeDefined()
    expect(existsSync(join(DIR, active!))).toBe(true)
  })

  it('every saved theme defines the same tokens, so switching back never loses styles', () => {
    const expected = tokensIn('exam-paper.css')
    expect(expected.length).toBeGreaterThan(30)
    for (const theme of themes) expect(tokensIn(theme), theme).toEqual(expected)
  })
})
