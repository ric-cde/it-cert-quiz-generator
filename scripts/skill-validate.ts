import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { type ExamCatalogue, unknownCategories, validateBank } from '../src/shared/question-bank-checks'

/**
 * The skill's validator, bundled by `scripts/build-skill.ts` into `scripts/validate.mjs`, so Claude
 * runs the same checks as the import screen.
 *
 * Usage: node scripts/validate.mjs bank.json [--expected N] [--exams exams.json]
 */

const here = dirname(fileURLToPath(import.meta.url))

function fail(message: string): never {
  console.log(`ERROR: ${message}`)
  process.exit(1)
}

function readJsonFile(path: string): unknown {
  let text: string
  try {
    text = readFileSync(path, 'utf8').replace(/^﻿/, '')
  } catch {
    fail(`Couldn't read ${path}`)
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    fail(`${path} isn't valid JSON: ${(error as Error).message}`)
  }
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { expected: { type: 'string' }, exams: { type: 'string' } },
})
const [file] = positionals
if (!file) fail('Usage: node scripts/validate.mjs bank.json [--expected N] [--exams exams.json]')

const examsFile = values.exams ?? resolve(here, '../assets/exams.json')
const catalogue = readJsonFile(examsFile) as ExamCatalogue
const result = validateBank(readJsonFile(file), catalogue)

if (!result.ok) {
  for (const problem of result.problems) console.log(`ERROR  ${problem.location}: ${problem.message}`)
  console.log(`\n${result.problems.length} error(s). Fix them and run this again.`)
  process.exit(1)
}

const { bank, warnings } = result
const questions = bank.chapters.flatMap((chapter) => chapter.questions)
const omitted = bank.omitted?.length ?? 0

const tally = (keys: string[]) => {
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts].map(([key, count]) => `${key}: ${count}`).join(', ')
}
const options = questions.flatMap((question) => (question.type === 'free_form' ? [] : question.options))
const withText = options.filter((option) => option.explanationMd)
const exam = catalogue.find((item) => item.name === bank.exam)!
const used = new Set(questions.map((question) => question.category))
// A category counts as covered when it, or one of its topics, has a question.
const emptyCategories = exam.categories.filter(
  (category) => !used.has(category) && !(exam.topics?.[category] ?? []).some((topic) => used.has(topic)),
)
const unknown = unknownCategories(bank, exam)
const withQuestionText = questions.filter((question) => question.type !== 'free_form' && question.explanationMd)
const unexplainedQuestions = questions.filter(
  (question) =>
    question.type !== 'free_form' && !question.explanationMd && !question.options.some((option) => option.explanationMd),
)

console.log(`Exam: ${bank.exam}`)
console.log(`Source: ${bank.source.name} (${bank.source.origin})`)
console.log(`Questions: ${questions.length} included, ${omitted} omitted`)
for (const chapter of bank.chapters) console.log(`  ${chapter.name}: ${chapter.questions.length}`)
console.log(`By type: ${tally(questions.map((question) => question.type))}`)
console.log(`By category: ${tally(questions.map((question) => question.category))}`)
if (emptyCategories.length > 0) console.log(`Categories with no questions: ${emptyCategories.join(', ')}`)
if (unknown.size > 0) {
  const names = [...unknown].map(([name, count]) => `"${name}" (${count})`).join(', ')
  console.log(`Not the exam's own categories or topics: ${names}. The import screen will ask where each goes.`)
}
console.log(`Options with explanations: ${withText.length} of ${options.length}`)
console.log(`Questions with their own explanation: ${withQuestionText.length}`)
console.log(`Multiple choice questions with no explanation at all: ${unexplainedQuestions.length}`)
console.log(`Marked for review: ${questions.filter((question) => question.reviewNote).length}`)
// A question under review has good reason for no explanation: it shouldn't justify a doubtful answer.
const unexplained = questions
  .filter((question) => !question.reviewNote)
  .flatMap((question) => (question.type === 'free_form' ? [] : question.options))
  .filter((option) => option.isCorrect && !option.explanationMd).length
console.log(`Correct options with no explanation: ${unexplained}`)

for (const warning of warnings) console.log(`WARNING  ${warning.location}: ${warning.message}`)

if (values.expected !== undefined) {
  const expected = Number(values.expected)
  if (questions.length + omitted !== expected) {
    fail(
      `Expected ${expected} questions from the source, but found ${questions.length} included + ${omitted} omitted = ${questions.length + omitted}. Find the difference before continuing.`,
    )
  }
  console.log(`Count matches the source: ${expected}`)
}

console.log(warnings.length > 0 ? `\nValid, with ${warnings.length} warning(s) to judge.` : '\nValid, with no warnings.')
