import type { HighlighterCore, ThemeRegistration } from 'shiki/core'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/**
 * Shiki only accepts hex colours, so each kind of token gets a stand-in that's swapped for a
 * CSS variable. The real colours live in the theme file, so a theme controls code as well.
 */
const CODE = {
  ink: '#000001',
  comment: '#000002',
  string: '#000003',
  constant: '#000004',
  keyword: '#000005',
  operator: '#000006',
  function: '#000007',
  type: '#000008',
}

const COLOR_REPLACEMENTS = Object.fromEntries(
  Object.entries(CODE).map(([name, standIn]) => [standIn, `var(--color-code-${name})`]),
)

const theme: ThemeRegistration = {
  name: 'cert-ink',
  type: 'dark',
  fg: CODE.ink,
  bg: '#00000000',
  settings: [
    { settings: { foreground: CODE.ink } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: CODE.comment, fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'markup.inline.raw'], settings: { foreground: CODE.string } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: CODE.constant } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control'], settings: { foreground: CODE.keyword } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: CODE.operator } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: CODE.function } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.class', 'support.type'], settings: { foreground: CODE.type } },
    { scope: ['entity.name.tag'], settings: { foreground: CODE.keyword } },
    { scope: ['entity.other.attribute-name', 'support.type.property-name'], settings: { foreground: CODE.function } },
  ],
}

/** Loaded one at a time, the first time a question uses them. */
const languages: Record<string, () => Promise<unknown>> = {
  java: () => import('shiki/dist/langs/java.mjs'),
  javascript: () => import('shiki/dist/langs/javascript.mjs'),
  typescript: () => import('shiki/dist/langs/typescript.mjs'),
  tsx: () => import('shiki/dist/langs/tsx.mjs'),
  jsx: () => import('shiki/dist/langs/jsx.mjs'),
  json: () => import('shiki/dist/langs/json.mjs'),
  sql: () => import('shiki/dist/langs/sql.mjs'),
  html: () => import('shiki/dist/langs/html.mjs'),
  css: () => import('shiki/dist/langs/css.mjs'),
  xml: () => import('shiki/dist/langs/xml.mjs'),
  bash: () => import('shiki/dist/langs/bash.mjs'),
  python: () => import('shiki/dist/langs/python.mjs'),
  yaml: () => import('shiki/dist/langs/yaml.mjs'),
  markdown: () => import('shiki/dist/langs/markdown.mjs'),
  csharp: () => import('shiki/dist/langs/csharp.mjs'),
}

const aliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
  yml: 'yaml',
  md: 'markdown',
  cs: 'csharp',
  'c#': 'csharp',
}

export function resolveLanguage(language: string | undefined): string | undefined {
  if (!language) return undefined
  const lower = language.toLowerCase()
  const name = aliases[lower] ?? lower
  return name in languages ? name : undefined
}

let highlighter: Promise<HighlighterCore> | undefined

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [theme],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter
}

/**
 * Returns highlighted HTML, or null if the language isn't one we highlight. Shiki escapes the
 * code it's given, so its output is safe to insert even though question text comes from third parties.
 */
export async function highlight(code: string, language: string | undefined): Promise<string | null> {
  const name = resolveLanguage(language)
  if (!name) return null

  const shiki = await getHighlighter()
  if (!shiki.getLoadedLanguages().includes(name)) {
    const module = (await languages[name]!()) as { default: Parameters<HighlighterCore['loadLanguage']>[0] }
    await shiki.loadLanguage(module.default)
  }
  return shiki.codeToHtml(code, { lang: name, theme: 'cert-ink', colorReplacements: COLOR_REPLACEMENTS })
}
