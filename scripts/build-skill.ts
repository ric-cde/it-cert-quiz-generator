import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { zipSync } from 'fflate'
import { SEED_EXAMS, syllabusMarkdown } from '../src/server/db/seed'
import { questionBankJsonSchema } from '../src/shared/question-bank'

/**
 * Assembles the skill for uploading to the Claude apps: the hand-written files in
 * `skill/creating-question-banks`, plus what's generated from the app, so that they can't drift.
 *
 * Run with `npm run skill:build` after changing the format, the checks, the exams or the skill.
 */

export const SKILL_NAME = 'creating-question-banks'
const SOURCE_DIR = resolve('skill', SKILL_NAME)

/** Forward slashes on every platform, because the zip is opened on Linux. */
function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

export async function buildSkill(outDir = resolve('dist/skill')) {
  const folder = join(outDir, SKILL_NAME)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(join(folder, 'assets'), { recursive: true })
  cpSync(SOURCE_DIR, folder, { recursive: true })

  const asset = (name: string, value: unknown) =>
    writeFileSync(join(folder, 'assets', name), `${JSON.stringify(value, null, 2)}\n`)

  asset('question-bank.schema.json', questionBankJsonSchema())
  asset('question-bank.example.json', JSON.parse(readFileSync('docs/question-bank.example.json', 'utf8')))
  // A list of exams the validator can read, with what helps in choosing a category.
  asset(
    'exams.json',
    SEED_EXAMS.map((item) => ({
      name: item.exam,
      ...(item.description ? { description: item.description } : {}),
      categories: item.categories.map((category) => category.name),
      ...(item.categories.some((category) => category.topics)
        ? {
            topics: Object.fromEntries(
              item.categories
                .filter((category) => category.topics)
                .map((category) => [category.name, category.topics!.map((topic) => topic.name)]),
            ),
          }
        : {}),
      ...(syllabusMarkdown(item) ? { syllabus: syllabusMarkdown(item) } : {}),
    })),
  )

  await build({
    entryPoints: ['scripts/skill-validate.ts'],
    outfile: join(folder, 'scripts', 'validate.mjs'),
    bundle: true,
    minify: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    logLevel: 'silent',
  })

  const files = Object.fromEntries(
    listFiles(folder).map((path) => [
      `${SKILL_NAME}/${relative(folder, path).replaceAll('\\', '/')}`,
      new Uint8Array(readFileSync(path)),
    ]),
  )
  const zipPath = join(outDir, `${SKILL_NAME}.zip`)
  writeFileSync(zipPath, zipSync(files, { level: 9 }))
  return { folder, zipPath }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { zipPath } = await buildSkill()
  console.log(`Built ${relative(process.cwd(), zipPath)}. Upload it at Customize > Skills in Claude.`)
}
