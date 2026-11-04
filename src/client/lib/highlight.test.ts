import { describe, expect, it } from 'vitest'
import { highlight, resolveLanguage } from './highlight'

describe('resolveLanguage', () => {
  it.each([
    ['java', 'java'],
    ['JAVA', 'java'],
    ['ts', 'typescript'],
    ['c#', 'csharp'],
    ['cobol', undefined],
    [undefined, undefined],
  ])('%j gives %j', (input, expected) => {
    expect(resolveLanguage(input)).toBe(expected)
  })
})

describe('highlight', () => {
  it('colours code in a supported language', async () => {
    const html = await highlight('int x = 1;', 'java')
    expect(html).toContain('style=')
    expect(html).toContain('int')
  })

  it('returns nothing for a language it does not know', async () => {
    expect(await highlight('anything', 'cobol')).toBeNull()
    expect(await highlight('anything', undefined)).toBeNull()
  })

  it('escapes the code it is given', async () => {
    const html = await highlight('"<script>alert(1)</script>"', 'java')
    expect(html).not.toContain('<script>')
  })
})
