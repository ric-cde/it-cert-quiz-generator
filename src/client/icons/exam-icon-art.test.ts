import { describe, expect, it } from 'vitest'
import { EXAM_ICONS } from '@shared/exam-icons'
import { EXAM_ICON_ART } from './exam-icon-art.generated'

describe('the exam icon artwork', () => {
  it('has a logo for every icon in the list, and none for icons that were dropped', () => {
    // Fails after the list is edited until `npm run icons:build` is run.
    expect(Object.keys(EXAM_ICON_ART)).toEqual(EXAM_ICONS.map((icon) => icon.key))
  })

  it('is a complete SVG each time, with its own colours and no script in it', () => {
    for (const [key, svg] of Object.entries(EXAM_ICON_ART)) {
      expect(svg, key).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d. ]+">.+<\/svg>$/s)
      expect(svg, key).not.toMatch(/<script|onload|onerror|javascript:/i)
      // An image can't inherit the page's text colour, so a logo that asked for it would be black.
      expect(svg, key).not.toContain('currentColor')
    }
  })
})
