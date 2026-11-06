import { describe, expect, it } from 'vitest'
import { iconChoices, iconName, isIconKey, SOURCE_ICON_KEYS, suggestIcon } from './source-icons'

const pool = SOURCE_ICON_KEYS
const first = pool[0]!
const second = pool[1]!

describe('the icon pool', () => {
  it('has plenty of icons, each listed once, with keys that are safe to store', () => {
    expect(pool.length).toBeGreaterThanOrEqual(50)
    expect(new Set(pool).size).toBe(pool.length)
    for (const key of pool) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('knows which keys are in it', () => {
    expect(isIconKey(first)).toBe(true)
    expect(isIconKey('dodo')).toBe(true)
    expect(isIconKey('not-an-animal')).toBe(false)
    expect(isIconKey(null)).toBe(false)
    expect(isIconKey(7)).toBe(false)
  })

  it('names an icon for people', () => {
    expect(iconName('fox')).toBe('Fox')
    expect(iconName('polar-bear')).toBe('Polar bear')
    expect(iconName('t-rex')).toBe('T rex')
  })
})

describe('choosing an icon', () => {
  it('offers the whole pool, in order, when none is taken', () => {
    expect(iconChoices([])).toEqual(pool)
    expect(suggestIcon([])).toBe(first)
  })

  it('leaves out the icons other sources hold, and suggests the first left', () => {
    expect(iconChoices([first, second])).toEqual(pool.slice(2))
    expect(suggestIcon([first, second])).toBe(pool[2])
    // The order they were taken in doesn't matter: the first free one in pool order is suggested.
    expect(suggestIcon([second])).toBe(first)
  })

  it('ignores sources with no icon, and icons that are no longer in the pool', () => {
    expect(iconChoices([null, 'retired-animal', first])).toEqual(pool.slice(1))
  })

  it('wraps around once every icon is taken, starting again from the first', () => {
    expect(iconChoices(pool)).toEqual(pool)
    expect(suggestIcon(pool)).toBe(first)
  })

  it('then offers only the icons held the fewest times, so a second round fills in order', () => {
    expect(suggestIcon([...pool, first])).toBe(second)
    expect(iconChoices([...pool, first, second])).toEqual(pool.slice(2))
    expect(iconChoices([...pool, ...pool, first])).toEqual(pool.slice(1))
  })
})
