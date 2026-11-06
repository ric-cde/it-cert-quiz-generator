import { expect, type Page } from '@playwright/test'

export const EXAM = 'OutSystems Associate Developer (O11)'

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A source tile, by its exact name. Its accessible name runs on into its question count. */
export const sourceTile = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${escape(name)}\\s*\\d+ questions?`) })

/**
 * Starts a quiz of one source the way you would: home, Practise, the source's tile, then the
 * options. Tests share one database, so each picks its own source rather than Random.
 */
export async function startSource(page: Page, name: string, feedback: 'After each question' | 'At the end') {
  await page.goto('/')
  await page.getByRole('link', { name: `Practise ${EXAM}` }).click()
  await expect(page).toHaveURL(/\/exam\/\d+/)
  await sourceTile(page, name).click()
  await page.getByRole('radio', { name: 'Max' }).click()
  await page.getByRole('radio', { name: feedback }).click()
  await page.getByRole('button', { name: 'Start quiz' }).click()
  await expect(page).toHaveURL(/\/quiz\/\d+$/)
}
