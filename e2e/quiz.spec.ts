import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { EXAM, sourceTile, startSource } from './helpers'

/** Each test imports its own source, with its own wording, because they share one database. */
function bank(name: string) {
  return {
    formatVersion: 1,
    exam: EXAM,
    source: { name, origin: 'upload' },
    chapters: [
      {
        name: 'Set',
        questions: [
          {
            externalId: 'one',
            type: 'single',
            category: 'Logic',
            bodyMd: `${name}: what does this print?\n\n\`\`\`java\nSystem.out.println(1 + 2);\n\`\`\``,
            options: [
              { bodyMd: `${name} three`, isCorrect: true, explanationMd: 'Because 1 + 2 is 3.', explanationOrigin: 'generated' },
              { bodyMd: `${name} twelve`, isCorrect: false },
            ],
            lockOptionOrder: true,
          },
          {
            externalId: 'two',
            type: 'multi',
            category: 'Logic',
            bodyMd: `${name}: choose two.`,
            reviewNote: 'The source looks wrong here.',
            options: [
              { bodyMd: `${name} alpha`, isCorrect: true },
              { bodyMd: `${name} beta`, isCorrect: true },
              { bodyMd: `${name} gamma`, isCorrect: false },
            ],
            lockOptionOrder: true,
          },
        ],
      },
    ],
  }
}

async function importBank(page: Page, name: string) {
  const res = await page.request.post('/api/import/commit', { data: { bank: bank(name) } })
  expect(res.ok()).toBe(true)
}

async function start(page: Page, name: string, feedback: 'after each question' | 'at the end') {
  await startSource(page, name, feedback === 'at the end' ? 'At the end' : 'After each question')
  await expect(page.getByText(/Question 1 of 2/)).toBeVisible()
}

/** Questions are shuffled, so this finds out which one is showing. */
async function onCodeQuestion(page: Page) {
  return (await page.locator('pre').count()) > 0
}

test('feedback after each question: answers, marks, saves and finishes, by keyboard', async ({ page }) => {
  const name = 'After each'
  await importBank(page, name)
  await start(page, name, 'after each question')

  for (const round of [1, 2]) {
    await expect(page.getByText(new RegExp(`Question ${round} of 2`))).toBeVisible()
    if (await onCodeQuestion(page)) {
      await expect(page.locator('.code-block')).toBeVisible()
      await page.keyboard.press('1')
      await page.keyboard.press('Enter')
      await expect(page.getByText('Correct', { exact: true })).toBeVisible()
      await expect(page.getByText('Because 1 + 2 is 3.')).toBeVisible()
      await expect(page.getByText('Your answer')).toBeVisible()
    } else {
      // A doubtful question warns first, and gives its reason only after answering.
      await expect(page.getByText(/in doubt/)).toBeVisible()
      await expect(page.getByText(/source looks wrong/)).toBeHidden()
      await page.keyboard.press('1')
      await page.keyboard.press('Enter')
      // One of the two right options is all-or-nothing wrong.
      await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
      await expect(page.getByText(/source looks wrong/)).toBeVisible()
    }
    await page.keyboard.press('Enter')
  }

  await expect(page.getByRole('heading', { name: 'Quiz finished' })).toBeVisible()
  await expect(page.getByText(/1 of 2 correct/)).toBeVisible()

  await expect(page.getByRole('button', { name: 'Retry missed (1)' })).toBeVisible()
})

test('feedback at the end: shows nothing, skips with nothing selected, and scores afterwards', async ({ page }) => {
  const name = 'At the end'
  await importBank(page, name)
  await start(page, name, 'at the end')

  await expect(page.getByRole('button', { name: /^Submit/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Reveal/ })).toHaveCount(0)

  const answeredCode = await onCodeQuestion(page)
  await page.keyboard.press('1')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Question 2 of 2/)).toBeVisible()
  await expect(page.getByText(/^(Correct|Incorrect)$/)).toHaveCount(0)

  await page.getByRole('button', { name: /^Next/ }).click()

  await expect(page.getByRole('heading', { name: 'Quiz finished' })).toBeVisible()
  await expect(page.getByText(`${answeredCode ? 1 : 0} of 2 correct`, { exact: false })).toBeVisible()
  await expect(page.getByText(/1 skipped/)).toBeVisible()
})

test('a quiz survives closing the page, with the same option order, and appears on the home page', async ({ page }) => {
  const name = 'Resuming'
  await importBank(page, name)
  await start(page, name, 'after each question')
  const url = page.url()
  const firstBody = await page.locator('.prose-quiz').first().innerText()

  await page.getByRole('button', { name: /Reveal answer/ }).click()
  await expect(page.getByText('Revealed', { exact: true })).toBeVisible()
  await expect(page.locator('[data-revealed]')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Revealed', { exact: true })).toBeVisible()
  await expect(page.locator('.prose-quiz').first()).toHaveText(firstBody)

  await page.goto('/')
  await page.getByRole('link', { name: `Resume ${name}: 0 of 2 done` }).click()
  await expect(page).toHaveURL(url)
  await expect(page.getByText('Revealed', { exact: true })).toBeVisible()
})

test('a flagged question can be left, and stays out of the next quiz', async ({ page }) => {
  const name = 'Flagging'
  await importBank(page, name)
  await start(page, name, 'after each question')

  await page.getByRole('button', { name: 'Flag', exact: true }).click()
  await page.getByLabel(/What's wrong with it/).fill('Nonsense')
  await page.getByRole('button', { name: 'Save reason' }).click()
  await expect(page.getByRole('button', { name: 'Save reason' })).toBeDisabled()

  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByText(/Question 2 of 2/)).toBeVisible()

  await page.goto('/')
  await page.getByRole('link', { name: `Practise ${EXAM}` }).click()
  await expect(sourceTile(page, name)).toContainText(/1 question\b/)
})

test('ending early keeps what was answered', async ({ page }) => {
  const name = 'Ending early'
  await importBank(page, name)
  await start(page, name, 'after each question')

  await page.getByRole('button', { name: /Reveal answer/ }).click()
  await expect(page.getByText('Revealed', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'End quiz' }).click()
  await page.getByRole('button', { name: 'Yes, end it' }).click()

  await expect(page.getByRole('heading', { name: 'Quiz finished' })).toBeVisible()
  await expect(page.getByText(/1 revealed, 1 question not reached/)).toBeVisible()
})

test.describe('the quiz screen', () => {
  for (const [state, prepare] of [
    ['while answering', async () => {}],
    ['once marked', async (page: Page) => {
      await page.keyboard.press('1')
      await page.keyboard.press('Enter')
      await expect(page.getByText('Your answer')).toBeVisible()
    }],
    ['after a reveal', async (page: Page) => {
      await page.getByRole('button', { name: /Reveal answer/ }).click()
      await expect(page.getByText('Revealed', { exact: true })).toBeVisible()
    }],
  ] as const) {
    test(`has no accessibility violations ${state}, and doesn't scroll sideways on a phone`, async ({ page }) => {
      const name = `Screen ${state}`
      await importBank(page, name)
      await page.setViewportSize({ width: 360, height: 740 })
      await start(page, name, 'after each question')
      await prepare(page)

      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
