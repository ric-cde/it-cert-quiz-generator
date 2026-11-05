import { describe, expect, it } from 'vitest'
import { parseBankFile } from './bank-file'

describe('parseBankFile', () => {
  it('reads plain JSON', () => {
    expect(parseBankFile('{"a": 1}')).toEqual({ ok: true, bank: { a: 1 } })
  })

  it('forgives a byte order mark', () => {
    expect(parseBankFile('﻿{"a": 1}')).toEqual({ ok: true, bank: { a: 1 } })
  })

  it.each(['```json\n{"a": 1}\n```', '```\n{"a": 1}\n```\n'])('forgives a code fence around it: %j', (text) => {
    expect(parseBankFile(text)).toEqual({ ok: true, bank: { a: 1 } })
  })

  it('keeps fences that are inside the data', () => {
    const value = { bodyMd: '```java\nint x;\n```' }
    expect(parseBankFile(JSON.stringify(value))).toEqual({ ok: true, bank: value })
  })

  it('says when a file is empty', () => {
    expect(parseBankFile('  \n')).toEqual({ ok: false, message: 'This file is empty.' })
  })

  it('says when a file seems cut off', () => {
    const result = parseBankFile('{"chapters": [{"name": "One", "questions": [')
    expect(!result.ok && result.message).toMatch(/cut off/)
  })

  it('says when complete-looking JSON is broken', () => {
    const result = parseBankFile('{"a": 1,}')
    expect(!result.ok && result.message).toMatch(/isn't valid JSON/)
  })
})
