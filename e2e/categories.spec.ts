import { expect, test } from '@playwright/test'

const EXAM = 'OutSystems Associate Developer (O11)'

const bank = (name: string, category: string, text: string) => ({
  formatVersion: 1,
  exam: EXAM,
  source: { name, origin: 'upload', trust: 'official', reference: 'https://example.com/sample-exam' },
  chapters: [
    {
      name: 'Set',
      questions: [
        {
          externalId: 'one',
          type: 'single',
          category,
          bodyMd: `${text}?`,
          explanationMd: `Why ${text} works.`,
          options: [
            { bodyMd: `${text} right`, isCorrect: true },
            { bodyMd: `${text} wrong`, isCorrect: false },
          ],
        },
      ],
    },
  ],
})

async function preview(page: import('@playwright/test').Page, contents: object) {
  await page.goto('/import')
  await page.getByLabel(/Choose a question bank file/).setInputFiles({
    name: 'bank.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(contents)),
  })
}

test('a category the exam lacks is mapped on import, and the choice is remembered', async ({ page }) => {
  await preview(page, bank('Mapping source', 'Widgets and screens', 'Mapping'))

  await expect(page.getByText('New to this exam')).toBeVisible()
  await expect(page.getByText('Official', { exact: true })).toBeVisible()
  const choice = page.getByRole('combobox', { name: /"Widgets and screens"/ })
  await expect(choice).toHaveValue('keep')
  await choice.selectOption({ label: 'UI Design › Screen Widgets' })
  await page.getByRole('button', { name: 'Import 1 question' }).click()
  await expect(page.getByRole('status')).toHaveText('1 question added.')

  // The next file using that name goes to the same place without asking.
  await page.getByRole('button', { name: 'Import another file' }).click()
  await preview(page, bank('Mapping source two', 'Widgets and screens', 'Remembered'))
  await expect(page.getByText('Mapped on an earlier import')).toBeVisible()
  await expect(page.getByRole('combobox', { name: /"Widgets and screens"/ })).toHaveValue(/^\d+$/)
})

test('a question shows its own explanation after answering, with its topic', async ({ page }) => {
  const res = await page.request.post('/api/import/commit', { data: { bank: bank('Explained source', 'Aggregates', 'Explained') } })
  expect(res.ok()).toBe(true)

  await page.goto('/')
  await page.getByRole('button', { name: 'Start Explained source, feedback after each question' }).click()
  await page.getByText('Explained wrong').click()
  await page.getByRole('button', { name: /^Submit/ }).click()

  await expect(page.getByText('Why Explained works.')).toBeVisible()
  await expect(page.getByText(/Fetching Data › Aggregates/)).toBeVisible()
  await expect(page.getByText(/No explanation/)).toHaveCount(0)
})
