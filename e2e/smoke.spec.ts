import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('the app loads data from the server through the production build', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/Connected\./)).toBeVisible()
  await expect(page.getByText(/Admin \(admin\)/)).toBeVisible()
})

test('a client-side route survives a page reload', async ({ page }) => {
  await page.goto('/dev/components')
  await expect(page.getByRole('heading', { name: 'Component gallery' })).toBeVisible()
})

test('an unknown API route is a 404, not the app', async ({ request }) => {
  expect((await request.get('/api/nope')).status()).toBe(404)
})

test.describe('component gallery', () => {
  test('highlights Java in the real browser', async ({ page }) => {
    await page.goto('/dev/components')
    await expect(page.locator('#code .shiki').first()).toBeVisible()
  })

  test('uses the bundled fonts, not a fallback', async ({ page }) => {
    await page.goto('/dev/components')
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready
      return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
    })
    expect(loaded.join()).toContain('Atkinson Hyperlegible Next')
    expect(loaded.join()).toContain('Atkinson Hyperlegible Mono')
  })

  test('has no accessibility violations, including colour contrast', async ({ page }) => {
    await page.goto('/dev/components')
    await expect(page.locator('#code .shiki').first()).toBeVisible()
    // Elements disabled on purpose are exempt from contrast rules, so no exclusions are needed.
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
  })

  test('never scrolls sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/dev/components')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
