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

test.describe('data inspector', () => {
  test('is reached from the footer and shows the seeded categories, across pages', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Data inspector' }).click()
    await page.getByRole('navigation', { name: 'Tables' }).getByRole('link', { name: /^categories/ }).click()

    await expect(page).toHaveURL(/\/dev\/data\/categories$/)
    await expect(page.getByRole('cell', { name: 'Controlling Program Flow' })).toBeVisible()
    await expect(page.getByText('Page 1 of 2')).toBeVisible()

    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText('Page 2 of 2')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Tools and MCPs' })).toBeVisible()
  })

  test('sorts by a column, and the address keeps it through a reload', async ({ page }) => {
    await page.goto('/dev/data/categories')
    await page.getByRole('button', { name: 'name', exact: true }).click()
    await expect(page.locator('tbody tr').first()).toContainText('Agents and Workflows')

    await page.reload()
    await expect(page.locator('tbody tr').first()).toContainText('Agents and Workflows')
  })

  for (const { name, table } of [
    { name: 'with rows', table: 'categories' },
    { name: 'empty', table: 'questions' },
  ]) {
    test(`has no accessibility violations ${name}`, async ({ page }) => {
      await page.goto(`/dev/data/${table}`)
      await expect(page.getByRole('region', { name: table })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Tables' }).getByRole('link').first()).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
    })

    test(`never scrolls sideways on a phone ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(`/dev/data/${table}`)
      await expect(page.getByRole('region', { name: table })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('component gallery', () => {
  test('highlights Java in the real browser', async ({ page }) => {
    await page.goto('/dev/components')
    await expect(page.locator('#code .shiki').first()).toBeVisible()
  })

  test('colours code from the theme', async ({ page }) => {
    await page.goto('/dev/components')
    const keyword = page.locator('#code .shiki span[style*="--color-code-keyword"]').first()
    // The keyword token in themes/exam-paper.css is #a9bcff.
    await expect(keyword).toHaveCSS('color', 'rgb(169, 188, 255)')
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

  test('a revealed question also has no accessibility violations', async ({ page }) => {
    await page.goto('/dev/components')
    await page.locator('#try-it').getByRole('button', { name: /^Reveal answer/ }).click()
    await expect(page.locator('#try-it [data-revealed]')).toBeVisible()
    await expect(page.locator('#try-it [data-state="correct-missed"]').first()).toBeVisible()
    // Let the background finish changing, or the check sees a colour halfway through.
    await page.waitForTimeout(400)
    const { violations } = await new AxeBuilder({ page }).include('#try-it').analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
  })

  test('fits several filters on one line when there is room', async ({ page }) => {
    await page.goto('/dev/components')
    const top = async (name: string) =>
      (await page.getByRole('radiogroup', { name, exact: true }).first().boundingBox())!.y
    expect(await top('Type')).toBe(await top('Status'))
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
