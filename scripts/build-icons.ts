/**
 * Writes the animal artwork the client shows for sources: `npm run icons:build`.
 *
 * The icons to include are the keys in `src/shared/source-icons.ts`. Their artwork comes from
 * Fluent Emoji Flat (MIT), a dev dependency, so the app never loads anything from the network.
 * To swap the artwork for another set, change `loadArt` below. Keys and saved data stay as they are.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { SOURCE_ICON_KEYS } from '../src/shared/source-icons'

/** Keys whose artwork has a different name in the set. Every other key is the same name. */
const ART_NAME: Record<string, string> = {
  tiger: 'tiger-face',
  rabbit: 'rabbit-face',
  whale: 'spouting-whale',
  monkey: 'monkey-face',
  dragon: 'dragon-face',
  cat: 'cat-face',
  dog: 'dog-face',
  horse: 'horse-face',
  cow: 'cow-face',
  pig: 'pig-face',
  mouse: 'mouse-face',
}

type IconSet = { width: number; height: number; icons: Record<string, { body: string }> }

function loadArt(): Record<string, string> {
  const require = createRequire(import.meta.url)
  const set = JSON.parse(readFileSync(require.resolve('@iconify-json/fluent-emoji-flat/icons.json'), 'utf8')) as IconSet
  const missing: string[] = []
  const art = Object.fromEntries(
    SOURCE_ICON_KEYS.map((key) => {
      const icon = set.icons[ART_NAME[key] ?? key]
      if (!icon) missing.push(key)
      return [key, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${set.width} ${set.height}">${icon?.body}</svg>`]
    }),
  )
  if (missing.length > 0) throw new Error(`No artwork for: ${missing.join(', ')}. Add a name to ART_NAME, or remove the key.`)
  return art
}

const art = loadArt()
const lines = SOURCE_ICON_KEYS.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(art[key])},`)
const file = `// Written by \`npm run icons:build\` from src/shared/source-icons.ts. Don't edit by hand.
// Artwork: Fluent Emoji Flat, MIT licence, Microsoft.

/** Each source icon's key and its SVG, in pool order. */
export const SOURCE_ICON_ART: Record<string, string> = {
${lines.join('\n')}
}
`
const target = new URL('../src/client/icons/source-icon-art.generated.ts', import.meta.url)
writeFileSync(target, file)
console.log(`Wrote ${SOURCE_ICON_KEYS.length} icons (${Math.round(file.length / 1024)} KB) to src/client/icons/`)
