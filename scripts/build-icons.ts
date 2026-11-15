/**
 * Writes the artwork the client shows: `npm run icons:build`.
 *
 * Two files come out of it. The animals for sources are the keys in `src/shared/source-icons.ts`,
 * drawn from Fluent Emoji Flat (MIT). The logos for exams are the keys in `src/shared/exam-icons.ts`,
 * drawn from SVG Logos (CC0) where it has one, Simple Icons (CC0) where it doesn't, and the SVG
 * files in `src/client/icons/custom/` for anything neither has, such as OutSystems.
 *
 * The sets are dev dependencies, so the app never loads anything from the network. To swap an
 * icon's artwork, change where it comes from below. Keys and saved data stay as they are.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { EXAM_ICONS } from '../src/shared/exam-icons'
import { SOURCE_ICON_KEYS } from '../src/shared/source-icons'

/* ---------- Reading the icon sets ---------- */

type IconData = { body: string; width?: number; height?: number; left?: number; top?: number }
type IconSet = {
  width?: number
  height?: number
  icons: Record<string, IconData>
  aliases?: Record<string, { parent: string }>
}

const require = createRequire(import.meta.url)
const sets = new Map<string, IconSet>()

function loadSet(name: string) {
  if (!sets.has(name)) {
    sets.set(name, JSON.parse(readFileSync(require.resolve(`@iconify-json/${name}/icons.json`), 'utf8')) as IconSet)
  }
  return sets.get(name)!
}

/** An icon from a set as a whole SVG, or undefined when the set doesn't have it. `fill` colours single-colour icons. */
function fromSet(setName: string, iconName: string, fill?: string) {
  const set = loadSet(setName)
  const icon = set.icons[iconName] ?? set.icons[set.aliases?.[iconName]?.parent ?? '']
  if (!icon) return undefined
  const box = `${icon.left ?? 0} ${icon.top ?? 0} ${icon.width ?? set.width ?? 16} ${icon.height ?? set.height ?? 16}`
  const body = fill ? icon.body.replaceAll('currentColor', fill) : icon.body
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`
}

/** A hand-added SVG, on one line. */
function fromFile(name: string) {
  const path = new URL(`../src/client/icons/custom/${name}.svg`, import.meta.url)
  return readFileSync(path, 'utf8')
    .replaceAll(/\s*\n\s*/g, '')
    .trim()
}

function write(fileName: string, header: string, exportLine: string, art: [key: string, svg: string][]) {
  const lines = art.map(([key, svg]) => `  ${JSON.stringify(key)}: ${JSON.stringify(svg)},`)
  const file = `${header}\n\n${exportLine}\n${lines.join('\n')}\n}\n`
  writeFileSync(new URL(`../src/client/icons/${fileName}`, import.meta.url), file)
  console.log(`Wrote ${art.length} icons (${Math.round(file.length / 1024)} KB) to src/client/icons/${fileName}`)
}

function complain(missing: string[], advice: string) {
  if (missing.length > 0) throw new Error(`No artwork for: ${missing.join(', ')}. ${advice}`)
}

/* ---------- Source icons: animals ---------- */

/** Keys whose artwork has a different name in the set. Every other key is the same name. */
const ANIMAL_ART_NAME: Record<string, string> = {
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

function buildSourceIcons() {
  const missing: string[] = []
  const art = SOURCE_ICON_KEYS.map((key): [string, string] => {
    const svg = fromSet('fluent-emoji-flat', ANIMAL_ART_NAME[key] ?? key)
    if (!svg) missing.push(key)
    return [key, svg ?? '']
  })
  complain(missing, 'Add a name to ANIMAL_ART_NAME, or remove the key.')
  write(
    'source-icon-art.generated.ts',
    "// Written by `npm run icons:build` from src/shared/source-icons.ts. Don't edit by hand.\n// Artwork: Fluent Emoji Flat, MIT licence, Microsoft.",
    "/** Each source icon's key and its SVG, in pool order. */\nexport const SOURCE_ICON_ART: Record<string, string> = {",
    art,
  )
}

/* ---------- Exam icons: logos ---------- */

type LogoArt =
  /** A full-colour logo from SVG Logos. */
  | { logos: string }
  /** A single-colour logo from Simple Icons, filled with the brand's colour. */
  | { simple: string; fill: string }
  /** A file in `src/client/icons/custom/`, without its `.svg`. */
  | { custom: string }

/**
 * Where each exam icon's artwork comes from, when it isn't the SVG Logos icon with the same name
 * as the key. Prefer SVG Logos, and an `-icon` mark over a wordmark, because they're shown small.
 */
const LOGO_ART: Record<string, LogoArt> = {
  claude: { logos: 'claude-icon' },
  anthropic: { logos: 'anthropic-icon' },
  openai: { logos: 'openai-icon' },
  'hugging-face': { logos: 'hugging-face-icon' },
  pytorch: { logos: 'pytorch-icon' },
  outsystems: { custom: 'outsystems' },
  uipath: { simple: 'uipath', fill: '#fa4616' },
  appian: { simple: 'appian', fill: '#2322f0' },
  'power-bi': { logos: 'microsoft-power-bi' },
  tableau: { logos: 'tableau-icon' },
  snowflake: { logos: 'snowflake-icon' },
  databricks: { logos: 'databricks-icon' },
  okta: { logos: 'okta-icon' },
  azure: { logos: 'microsoft-azure' },
  cloudflare: { logos: 'cloudflare-icon' },
  docker: { logos: 'docker-icon' },
  terraform: { logos: 'terraform-icon' },
  hashicorp: { logos: 'hashicorp-icon' },
  gitlab: { logos: 'gitlab-icon' },
  github: { logos: 'github-icon' },
  git: { logos: 'git-icon' },
  'red-hat': { logos: 'redhat-icon' },
  linux: { logos: 'linux-tux' },
  kafka: { logos: 'kafka-icon' },
  mysql: { logos: 'mysql-icon' },
  mongodb: { logos: 'mongodb-icon' },
  spring: { logos: 'spring-icon' },
  angular: { logos: 'angular-icon' },
  nodejs: { logos: 'nodejs-icon' },
  django: { logos: 'django-icon' },
  android: { logos: 'android-icon' },
  wordpress: { logos: 'wordpress-icon' },
  typescript: { logos: 'typescript-icon' },
  kotlin: { logos: 'kotlin-icon' },
  go: { logos: 'gopher' },
  html: { logos: 'html-5' },
  css: { logos: 'css-3' },
  oracle: { simple: 'oracle', fill: '#f80000' },
  microsoft: { logos: 'microsoft-icon' },
  google: { logos: 'google-icon' },
  nvidia: { simple: 'nvidia', fill: '#76b900' },
  adobe: { logos: 'adobe-icon' },
  cisco: { simple: 'cisco', fill: '#1ba0d7' },
  comptia: { simple: 'comptia', fill: '#c8202f' },
  isc2: { simple: 'isc2', fill: '#468145' },
  fortinet: { simple: 'fortinet', fill: '#ee3124' },
  'palo-alto': { simple: 'paloaltonetworks', fill: '#f04e23' },
  juniper: { simple: 'junipernetworks', fill: '#84b135' },
  cncf: { simple: 'cncf', fill: '#231f20' },
  'linux-foundation': { simple: 'linuxfoundation', fill: '#003366' },
  scrum: { simple: 'scrumalliance', fill: '#009fda' },
}

function logoSvg(key: string) {
  const art = LOGO_ART[key] ?? { logos: key }
  if ('custom' in art) return fromFile(art.custom)
  if ('simple' in art) return fromSet('simple-icons', art.simple, art.fill)
  return fromSet('logos', art.logos)
}

function buildExamIcons() {
  const missing: string[] = []
  const art = EXAM_ICONS.map(({ key }): [string, string] => {
    const svg = logoSvg(key)
    if (!svg) missing.push(key)
    return [key, svg ?? '']
  })
  complain(missing, 'Say where it comes from in LOGO_ART, or remove the icon.')
  write(
    'exam-icon-art.generated.ts',
    "// Written by `npm run icons:build` from src/shared/exam-icons.ts. Don't edit by hand.\n// Artwork: SVG Logos and Simple Icons, both CC0, and the files in ./custom. The logos are their owners' trade marks.",
    "/** Each exam icon's key and its SVG, in list order. */\nexport const EXAM_ICON_ART: Record<string, string> = {",
    art,
  )
}

buildSourceIcons()
buildExamIcons()
