import { describe, expect, it } from 'vitest'
import { EXAM_ICONS, examIconFor } from './exam-icons'
import { SEED_EXAMS } from '../server/db/seed'

describe('the exam icon list', () => {
  it('lists each icon once, with a safe key, a name and lower-case terms', () => {
    const keys = EXAM_ICONS.map((icon) => icon.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const icon of EXAM_ICONS) {
      expect(icon.key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(icon.name).not.toBe('')
      expect(icon.terms.length).toBeGreaterThan(0)
      for (const term of icon.terms) expect(term, icon.key).toMatch(/^[a-z0-9+#]+( [a-z0-9+#]+)*$/)
    }
  })

  it('finds every icon by its own name', () => {
    for (const icon of EXAM_ICONS) expect(examIconFor(icon.name), icon.name).toBe(icon.key)
  })
})

describe('choosing an exam icon', () => {
  it('has a logo for every exam the app starts with', () => {
    const icons = SEED_EXAMS.map((item) => [item.subject, examIconFor(item.subject, item.exam)])
    expect(icons).toEqual([
      ['Java', 'java'],
      ['OutSystems', 'outsystems'],
      ['Claude', 'claude'],
    ])
  })

  it('gives every exam in a subject the same logo, whatever the exam is called', () => {
    expect(examIconFor('OutSystems', 'Associate Developer (O11)')).toBe('outsystems')
    expect(examIconFor('OutSystems', 'Java integration specialist')).toBe('outsystems')
    expect(examIconFor('OutSystems', 'Architecture Specialist (ODC)')).toBe('outsystems')
  })

  it("falls back to the exam's name when the subject matches nothing", () => {
    expect(examIconFor('Programming', 'Java SE 21 Developer Professional (1Z0-830)')).toBe('java')
    expect(examIconFor('Security', 'CompTIA Security+ (SY0-701)')).toBe('comptia')
  })

  it('has no logo when nothing matches', () => {
    expect(examIconFor('Project management', 'PRINCE2 Foundation')).toBeNull()
    expect(examIconFor('')).toBeNull()
  })

  it('matches whole words only, in any case', () => {
    expect(examIconFor('JAVA')).toBe('java')
    expect(examIconFor('JavaScript')).toBe('javascript')
    expect(examIconFor('Django')).toBe('django')
    expect(examIconFor('Category theory')).toBeNull()
    expect(examIconFor('Digital marketing')).toBeNull()
  })

  it('prefers the product to the language, and the language to the company', () => {
    expect(examIconFor('Oracle Java')).toBe('java')
    expect(examIconFor('Java Spring')).toBe('spring')
    expect(examIconFor('Microsoft Azure')).toBe('azure')
    expect(examIconFor('Anthropic Claude')).toBe('claude')
    expect(examIconFor('Oracle')).toBe('oracle')
  })

  it('reads names written with punctuation', () => {
    expect(examIconFor('C#')).toBe('c-sharp')
    expect(examIconFor('C++')).toBe('c-plusplus')
    expect(examIconFor('.NET')).toBe('dotnet')
    expect(examIconFor('ASP.NET Core')).toBe('dotnet')
    expect(examIconFor('Node.js')).toBe('nodejs')
    expect(examIconFor('Networking', 'Cisco CCNA (200-301)')).toBe('cisco')
    expect(examIconFor('Kubernetes (CKA)')).toBe('kubernetes')
  })
})
