import { describe, expect, it } from 'vitest'
import { formatStarted } from './quiz-words'

describe('formatStarted', () => {
  // A Thursday afternoon.
  const now = new Date(2026, 10, 19, 15, 0)
  const at = (...parts: [number, number, number, number, number]) => new Date(...parts).toISOString()

  it.each([
    ['earlier today', at(2026, 10, 19, 9, 5), '09:05 · Thu'],
    ['yesterday', at(2026, 10, 18, 18, 35), '18:35 · Wed'],
    ['six days ago', at(2026, 10, 13, 8, 0), '08:00 · Fri'],
    ['a week ago', at(2026, 10, 12, 8, 0), '08:00 · Nov 12'],
    ['last year', at(2025, 0, 3, 23, 59), '23:59 · Jan 3'],
  ])('%s', (_when, iso, expected) => {
    expect(formatStarted(iso, now)).toBe(expected)
  })
})
