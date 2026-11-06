import { describe, expect, it } from 'vitest'
import { SOURCE_ICON_KEYS } from '../../shared/source-icons'
import { SOURCE_ICON_ART } from './source-icon-art.generated'

describe('the source icon artwork', () => {
  it('has a picture for every icon in the pool, and none for icons that were dropped', () => {
    // Fails after the pool is edited until `npm run icons:build` is run.
    expect(Object.keys(SOURCE_ICON_ART)).toEqual([...SOURCE_ICON_KEYS])
  })

  it('is a complete SVG each time, with no script in it', () => {
    for (const [key, svg] of Object.entries(SOURCE_ICON_ART)) {
      expect(svg, key).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+">.+<\/svg>$/s)
      expect(svg, key).not.toMatch(/<script|onload|onerror|javascript:/i)
    }
  })
})
