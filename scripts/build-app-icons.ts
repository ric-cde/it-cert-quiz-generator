import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

// `npx tsx scripts/build-app-icons.ts`: draws the home screen icons in src/client/public from
// app-icon.svg, the favicon's tick on a square that fills the icon, kept inside the middle so a
// phone can crop it to any shape. Needs Playwright's Chromium (`npx playwright install chromium`).

const dir = 'src/client/public'
const svg = readFileSync(`${dir}/app-icon.svg`, 'utf8')
const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 }

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, size] of Object.entries(sizes)) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.screenshot({ path: `${dir}/${file}`, omitBackground: true })
  console.log(`${dir}/${file}`)
}
await browser.close()
