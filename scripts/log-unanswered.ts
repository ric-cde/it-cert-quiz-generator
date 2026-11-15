import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Runs as a PostCompact hook (see .claude/settings.json). CLAUDE.md asks for every compact
// summary to list open questions under an "Unanswered questions" heading, and this copies them
// into docs/unanswered.md, so they are saved without the model spending a turn on it.

const HEADING = /^[\s#*\d.)]*unanswered questions[\s*:]*$/i
const BULLET = /^\s*[-*]\s+(.*\S)\s*$/

/** The bullets under the last "Unanswered questions" heading in a piece of text. */
export function extractQuestions(text: string): string[] {
  const lines = text.split(/\r?\n/)
  let start = -1
  lines.forEach((line, index) => {
    if (HEADING.test(line)) start = index
  })
  if (start === -1) return []

  const questions: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') {
      if (questions.length > 0) break
      continue
    }
    const question = BULLET.exec(line)?.[1]
    if (!question) break
    if (!/^none\b/i.test(question)) questions.push(question)
  }
  return questions
}

/** Every string anywhere inside a parsed JSON value. */
export function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

/** Appends the questions the file doesn't already hold, and returns how many it added. */
export function appendQuestions(file: string, questions: string[], date: string): number {
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const fresh = [...new Set(questions)].filter((question) => !existing.includes(question))
  if (fresh.length === 0) return 0

  mkdirSync(dirname(file), { recursive: true })
  const gap = existing === '' || existing.endsWith('\n') ? '' : '\n'
  appendFileSync(file, gap + fresh.map((question) => `${date} | ${question}\n`).join(''))
  return fresh.length
}

function main() {
  const payload: unknown = JSON.parse(readFileSync(0, 'utf8'))
  const questions = collectStrings(payload).flatMap(extractQuestions)
  const date = new Date().toLocaleDateString('sv')
  const added = appendQuestions(join(process.cwd(), 'docs/unanswered.md'), questions, date)
  if (added > 0) {
    console.log(JSON.stringify({ systemMessage: `Logged ${added} question(s) in docs/unanswered.md` }))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
