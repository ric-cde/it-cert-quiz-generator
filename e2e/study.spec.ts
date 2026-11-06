import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { EXAM, sourceTile } from './helpers'

/** Three questions in two chapters, with names no other test uses, because they share one database. */
function bank(name: string) {
  const question = (id: string, category: string) => ({
    externalId: id,
    type: 'single',
    category,
    bodyMd: `${name} question ${id}?`,
    options: [
      { bodyMd: `${name} right ${id}`, isCorrect: true, explanationMd: `Why ${id} is right.` },
      { bodyMd: `${name} wrong ${id}`, isCorrect: false },
    ],
    lockOptionOrder: true,
  })
  return {
    formatVersion: 1,
    exam: EXAM,
    source: { name, origin: 'upload' },
    chapters: [
      { name: `${name} chapter one`, questions: [question('a', 'Logic'), question('b', 'Logic')] },
      { name: `${name} chapter two`, questions: [question('c', 'Data Modeling')] },
    ],
  }
}

async function importBank(page: Page, name: string) {
  const res = await page.request.post('/api/import/commit', { data: { bank: bank(name) } })
  expect(res.ok()).toBe(true)
}

const noViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
}
const noSidewaysScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

/** The live count's two numbers: how many you'll get, and how many are available. */
async function liveCount(page: Page) {
  const text = (await page.getByText(/of \d+ available/).locator('..').innerText()).replace(/\s+/g, ' ')
  const [, selected, available] = /(\d+) of (\d+) available/.exec(text)!
  return { selected: Number(selected), available: Number(available) }
}

test('the full study flow: choose, count, answer at the end, review and retry missed', async ({ page }) => {
  const name = 'Study flow'
  await importBank(page, name)

  await page.goto('/')
  await expect(page.getByRole('progressbar', { name: `${name} progress` })).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('link', { name: `Practise ${EXAM}` }).click()
  await expect(page.getByRole('button', { name: /^Random/ })).toHaveAttribute('aria-pressed', 'true')

  // One source, then narrowed to one of its chapters.
  await sourceTile(page, name).click()
  await expect(page.getByRole('button', { name: /^Random/ })).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => liveCount(page)).toEqual({ selected: 3, available: 3 })
  await page.getByRole('button', { name: `2 chapters in ${name}` }).click()
  await page.getByRole('button', { name: new RegExp(`^${name} chapter one`) }).click()
  await expect.poll(() => liveCount(page)).toEqual({ selected: 2, available: 2 })

  // The selection survives a reload, because it's in the address.
  await page.reload()
  await expect.poll(() => liveCount(page)).toEqual({ selected: 2, available: 2 })

  // Back to the whole source, then a cap below what's available.
  await sourceTile(page, name).click()
  await sourceTile(page, name).click()
  await expect.poll(() => liveCount(page)).toEqual({ selected: 3, available: 3 })
  await page.getByRole('textbox', { name: 'Custom number of questions' }).or(page.getByLabel('Custom number of questions')).fill('2')
  await expect.poll(() => liveCount(page)).toEqual({ selected: 2, available: 3 })

  // Max takes them all, and the quiz has exactly the count it showed.
  await page.getByRole('radio', { name: 'Max' }).click()
  await page.getByRole('radio', { name: 'At the end' }).click()
  await noViolations(page)
  await page.getByRole('button', { name: 'Start quiz' }).click()
  await expect(page.getByText(/Question 1 of 3/)).toBeVisible()

  // Right, wrong, then skipped.
  await page.getByText(/right [abc]$/).first().click()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Question 2 of 3/)).toBeVisible()
  await page.getByText(/wrong [abc]$/).first().click()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Question 3 of 3/)).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Quiz finished' })).toBeVisible()
  await expect(page.getByText(/1 of 3 correct/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'By category' })).toBeVisible()

  // After an at-the-end quiz, Review answers opens by itself.
  await expect(page.getByRole('button', { name: 'Review answers' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('article', { name: 'Question 3' }).getByText('Skipped')).toBeVisible()
  await expect(page.getByRole('article', { name: 'Question 2' }).getByText('Your answer')).toBeVisible()
  await noViolations(page)

  await page.getByRole('button', { name: 'Retry missed (2)' }).click()
  await expect(page.getByText(/Question 1 of 2/)).toBeVisible()

  // The retry is unfinished, so it can be resumed from home.
  await page.goto('/')
  await expect(page.getByRole('link', { name: `Resume Retry missed: ${name}: 0 of 2 done` })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: `${name} progress` })).toHaveAttribute('aria-valuenow', '33')
})

test('clicking anywhere on an exam card opens it, and a source row opens it with that source picked', async ({ page }) => {
  await importBank(page, 'Card click')
  await page.goto('/')
  // Near the title, where only the card's own link is.
  await page.getByRole('article', { name: EXAM }).click({ position: { x: 40, y: 30 } })
  await expect(page).toHaveURL(/\/exam\/\d+$/)

  await page.goto('/')
  await page.getByRole('link', { name: 'Card click', exact: true }).click()
  await expect(page).toHaveURL(/\/exam\/\d+\?sources=\d+$/)
  await expect(sourceTile(page, 'Card click')).toHaveAttribute('aria-pressed', 'true')
})

test('the status filter counts only what it should', async ({ page }) => {
  const name = 'Status filter'
  await importBank(page, name)
  await page.goto('/')
  await page.getByRole('link', { name: `Practise ${EXAM}` }).click()
  await sourceTile(page, name).click()
  await page.getByRole('radio', { name: 'Max' }).click()
  await page.getByRole('button', { name: 'Start quiz' }).click()

  // Reveal one, which counts as a miss.
  await page.getByRole('button', { name: /Reveal answer/ }).click()
  await expect(page.getByText('Revealed', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'End quiz' }).click()
  await page.getByRole('button', { name: 'Yes, end it' }).click()

  await page.getByRole('link', { name: 'Practise again' }).click()
  await sourceTile(page, name).click()
  await page.getByRole('radio', { name: 'Max' }).click()
  for (const [status, expected] of [
    ['Unanswered', 2],
    ['Incorrect', 1],
    ['Unsolved', 3],
    ['All', 3],
  ] as const) {
    await page.getByRole('radio', { name: status }).click()
    await expect.poll(() => liveCount(page)).toEqual({ selected: expected, available: expected })
  }
})

for (const screen of ['home', 'take exam'] as const) {
  test(`the ${screen} screen has no accessibility violations and doesn't scroll sideways on a phone`, async ({ page }) => {
    await importBank(page, `Screen check ${screen}`)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Your exams' })).toBeVisible()
    if (screen === 'take exam') {
      await page.getByRole('link', { name: `Practise ${EXAM}` }).click()
      await page.getByRole('button', { name: `2 chapters in Screen check ${screen}` }).click()
      await expect(page.getByText(/of \d+ available/)).toBeVisible()
    }
    await noViolations(page)
    await noSidewaysScroll(page)
  })
}
