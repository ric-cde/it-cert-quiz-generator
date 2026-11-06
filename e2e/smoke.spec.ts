import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('the app loads data from the server through the production build', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your exams' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'OutSystems Associate Developer (O11)' })).toBeVisible()
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

test.describe('importing a question bank', () => {
  const MOCK_BANK = 'skill/evals/mock-messy-source.expected.json'

  test('previews a file, imports it, shows it in the inspector, and can remove it', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Manage questions' }).getByRole('link', { name: 'Import' }).click()

    await page.getByLabel(/Choose a question bank file/).setInputFiles(MOCK_BANK)
    await expect(page.getByRole('heading', { name: 'Mock Java practice set' })).toBeVisible()
    await expect(page.getByText('Depends on an image')).toBeVisible()

    await page.getByText('Set 1: Collections and Language Basics').click()
    await expect(page.locator('section[aria-label="Preview"] .shiki').first()).toBeVisible()
    // `List<int>` in backticks has to survive, because plain text would vanish as HTML.
    await expect(page.getByText('List<int> a = new ArrayList<>();')).toBeVisible()

    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])

    await page.getByRole('button', { name: 'Import 8 questions' }).click()
    await expect(page.getByRole('status')).toHaveText('8 questions added.')

    await page.getByRole('link', { name: /data inspector/ }).click()
    await expect(page).toHaveURL(/\/dev\/data\/questions$/)
    // Newest first, because other tests share this database and add questions of their own.
    await page.goto('/dev/data/questions?sort=id&dir=desc')
    await expect(page.getByRole('cell', { name: 'set1-q9', exact: true })).toBeVisible()

    await page.goto('/import')
    // The mock's question 9 has a wrong answer in its source, so it's waiting for review.
    await page.getByRole('listitem').filter({ hasText: 'Mock Java practice set' }).getByRole('link', { name: '1 question to review' }).click()
    await expect(page.getByText(/string concatenation runs left to right/)).toBeVisible()
    await expect(page.locator('.shiki').first()).toBeVisible()
    const review = await new AxeBuilder({ page }).analyze()
    expect(review.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])

    await page.getByRole('button', { name: 'Change the answer' }).click()
    await page.getByText('a12', { exact: true }).click()
    await page.getByRole('button', { name: 'Save this answer' }).click()
    await expect(page.getByText(/Nothing left to review/)).toBeVisible()

    await page.goto('/import')
    await page.getByRole('button', { name: 'Delete Mock Java practice set' }).click()
    await page.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(page.getByRole('button', { name: 'Delete Mock Java practice set' })).toBeHidden()
  })

  test('lists what is wrong with a bad file, and imports nothing', async ({ page }) => {
    await page.goto('/import')
    await page.getByLabel(/Choose a question bank file/).setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ formatVersion: 1, exam: 'Nope', source: { name: 'x', origin: 'upload' }, chapters: [] })),
    })
    await expect(page.getByRole('heading', { name: /can't be imported yet/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Import/ })).toBeHidden()
  })

  test('never scrolls sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/import')
    await page.getByLabel(/Choose a question bank file/).setInputFiles(MOCK_BANK)
    await page.getByText('Set 1: Collections and Language Basics').click()
    await expect(page.getByRole('article').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
