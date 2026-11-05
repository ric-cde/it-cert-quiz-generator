import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SEED_EXAMS } from '../src/server/db/seed'
import { questionBankJsonSchema } from '../src/shared/question-bank'
import { buildSkill, SKILL_NAME } from './build-skill'

const EXPECTED = 'skill/evals/mock-messy-source.expected.json'

describe('the built skill', () => {
  let outDir: string
  let folder: string
  let zip: Record<string, Uint8Array>
  const text = (name: string) => new TextDecoder().decode(zip[`${SKILL_NAME}/${name}`])
  const validate = (...args: string[]) =>
    spawnSync(process.execPath, [join(folder, 'scripts/validate.mjs'), ...args], { encoding: 'utf8' })
  const writeTemp = (name: string, value: string) => {
    const path = join(outDir, name)
    writeFileSync(path, value)
    return path
  }

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'skill-'))
    const built = await buildSkill(outDir)
    folder = built.folder
    zip = unzipSync(new Uint8Array(readFileSync(built.zipPath)))
  }, 60_000)

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true })
  })

  describe('package', () => {
    it('has the skill folder at the root of the zip, with forward slashes', () => {
      for (const name of Object.keys(zip)) expect(name.startsWith(`${SKILL_NAME}/`), name).toBe(true)
      expect(Object.keys(zip).sort()).toEqual(
        [
          'SKILL.md',
          'assets/exams.json',
          'assets/question-bank.example.json',
          'assets/question-bank.schema.json',
          'references/format-guide.md',
          'references/source-pitfalls.md',
          'references/writing-guide.md',
          'scripts/check_schema.py',
          'scripts/validate.mjs',
        ].map((name) => `${SKILL_NAME}/${name}`),
      )
    })

    it('meets the limits for a skill', () => {
      const [, frontmatter, body] = text('SKILL.md').replaceAll('\r\n', '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)!
      const field = (name: string) => frontmatter!.match(new RegExp(`^${name}: (.*)$`, 'm'))![1]!

      expect(field('name')).toBe(SKILL_NAME)
      expect(field('name')).toMatch(/^[a-z0-9-]{1,64}$/)
      expect(field('name')).not.toMatch(/anthropic|claude/)
      // The Claude app allows 200 characters, and the API more.
      expect(field('description').length).toBeLessThanOrEqual(200)
      expect(field('description')).not.toMatch(/[<>]/)
      expect(body!.split('\n').length).toBeLessThan(500)
    })

    it('mentions only files that exist', () => {
      const mentioned = [...text('SKILL.md').matchAll(/`((?:references|assets|scripts)\/[\w.-]+)`|\]\(((?:references|assets|scripts)\/[\w.-]+)\)/g)]
      expect(mentioned.length).toBeGreaterThan(5)
      for (const match of mentioned) {
        const name = match[1] ?? match[2]!
        expect(zip[`${SKILL_NAME}/${name}`], name).toBeDefined()
      }
    })

    it('carries the current schema and every exam with its categories', () => {
      expect(JSON.parse(text('assets/question-bank.schema.json'))).toEqual(JSON.parse(JSON.stringify(questionBankJsonSchema())))

      const exams = JSON.parse(text('assets/exams.json')) as { name: string; categories: string[]; syllabus?: string }[]
      expect(exams.map((exam) => exam.name)).toEqual(SEED_EXAMS.map((item) => item.exam))
      expect(exams[1]!.categories).toEqual(SEED_EXAMS[1]!.categories.map((category) => category.name))
      expect(exams[1]!.syllabus).toContain('Screen Lifecycle')
      expect((exams[1] as unknown as { topics: Record<string, string[]> }).topics['Fetching Data']).toEqual([
        'Aggregates',
        'Fetching Data on Screens',
      ])
    })

    it('sets out the three modes and the explanation rule', () => {
      const guide = text('SKILL.md')
      for (const mode of ['A: Copy', 'B: From material', 'C: From research']) expect(guide).toContain(mode)
      expect(guide).toContain('A wrong option has no text:** leave it blank')
      expect(guide).toContain('The source has no text (mode A):** leave it blank')
      expect(guide).toContain('at the very end of its `bodyMd`')
      expect(text('references/writing-guide.md')).toContain('Writing free-form questions')
    })

    it('names the highlighted languages correctly in the guide', () => {
      const highlighter = readFileSync('src/client/lib/highlight.ts', 'utf8')
      const line = text('references/format-guide.md').match(/\*\*Languages highlighted:\*\* (.*)\. Others/)![1]!
      for (const [, language] of line.matchAll(/`(\w+)`/g)) expect(highlighter, language).toContain(`${language}: () =>`)
    })
  })

  describe('validator', () => {
    it('passes the example, and the expected result of the mock test with no warnings', () => {
      const example = validate('docs/question-bank.example.json')
      expect(example.status, example.stdout).toBe(0)

      const mock = validate(EXPECTED, '--expected', '10')
      expect(mock.status, mock.stdout).toBe(0)
      expect(mock.stdout).toContain('Valid, with no warnings.')
      expect(mock.stdout).toContain('8 included, 2 omitted')
      expect(mock.stdout).toContain('Marked for review: 1')
      expect(mock.stdout).toContain('Questions with their own explanation: 3')
      expect(mock.stdout).toContain('Count matches the source: 10')
    })

    it('counts correct options with no explanation, but not on a question under review', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      const before = validate(EXPECTED).stdout.match(/Correct options with no explanation: (\d+)/)![1]
      bank.chapters[0].questions[1].options.find((o: { isCorrect: boolean }) => o.isCorrect).explanationMd = 'Because.'
      const result = validate(writeTemp('explained.json', JSON.stringify(bank)))
      expect(result.stdout).toContain(`Correct options with no explanation: ${Number(before) - 1}`)
    })

    it('counts questions with no explanation anywhere', () => {
      const result = validate(EXPECTED)
      expect(result.stdout).toMatch(/Multiple choice questions with no explanation at all: \d+/)
    })

    it('fails when questions are lost', () => {
      const result = validate(EXPECTED, '--expected', '11')
      expect(result.status).toBe(1)
      expect(result.stdout).toContain('8 included + 2 omitted = 10')
    })

    it('fails with each error and where it is', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      bank.chapters[0].questions[0].type = 'single'
      const result = validate(writeTemp('bad-type.json', JSON.stringify(bank)))
      expect(result.status).toBe(1)
      expect(result.stdout).toMatch(/ERROR {2}Set 1.*question 1/)
    })

    it('passes a category the exam does not have, and lists it for the import screen', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      bank.chapters[0].questions[0].category = 'Made up'
      const result = validate(writeTemp('new-category.json', JSON.stringify(bank)))
      expect(result.status, result.stdout).toBe(0)
      expect(result.stdout).toContain(`Not the exam's own categories or topics: "Made up" (1)`)
    })

    it('treats an official topic as known, and as covering its category', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      const exams = [{ name: bank.exam, categories: ['Parent', 'Other'], topics: { Parent: ['Child'] } }]
      for (const question of bank.chapters[0].questions) question.category = 'Child'
      const result = validate(writeTemp('topics.json', JSON.stringify(bank)), '--exams', writeTemp('topic-exams.json', JSON.stringify(exams)))
      expect(result.stdout).not.toContain("Not the exam's own")
      expect(result.stdout).toContain('Categories with no questions: Other')
    })

    it('reports warnings but still passes', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      bank.chapters[0].questions[0].bodyMd = 'Is List<int> fine? Choose two.'
      const result = validate(writeTemp('warning.json', JSON.stringify(bank)))
      expect(result.status).toBe(0)
      expect(result.stdout).toMatch(/WARNING {2}.*set1-q1.*disappears/)
    })

    it('explains broken JSON, and accepts a byte order mark', () => {
      const broken = validate(writeTemp('broken.json', '{"formatVersion": 1,'))
      expect(broken.status).toBe(1)
      expect(broken.stdout).toContain("isn't valid JSON")

      const bom = validate(writeTemp('bom.json', `﻿${readFileSync(EXPECTED, 'utf8')}`))
      expect(bom.status, bom.stdout).toBe(0)
    })

    it('works for an exam the app has never heard of, given its names', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      bank.exam = 'Any Other Exam'
      for (const question of bank.chapters[0].questions) question.category = 'Topic one'
      const file = writeTemp('other-exam.json', JSON.stringify(bank))

      expect(validate(file).stdout).toContain('No exam is called "Any Other Exam"')

      const exams = writeTemp('other-exams.json', JSON.stringify([{ name: 'Any Other Exam', categories: ['Topic one', 'Topic two'] }]))
      const result = validate(file, '--exams', exams)
      expect(result.status, result.stdout).toBe(0)
      expect(result.stdout).toContain('Categories with no questions: Topic two')
    })

    it('shows a short sample with the finished file, rather than stopping to ask', () => {
      const skill = text('SKILL.md')
      expect(skill).toContain('**2-3 questions**')
      expect(skill).toContain("Don't stop part-way to ask the user to check a sample")
      expect(skill).not.toMatch(/sample of about 5|copy about 5/i)
    })

    it('does not tie its instructions to particular exams', () => {
      const guides = ['SKILL.md', 'references/format-guide.md', 'references/source-pitfalls.md', 'references/writing-guide.md']
      for (const name of guides) expect(text(name), name).not.toMatch(/OutSystems|Boyarsky|OCP/i)
    })

    it('accepts a different list of exams', () => {
      const bank = JSON.parse(readFileSync(EXPECTED, 'utf8'))
      const exams = [{ name: bank.exam, categories: [...new Set(bank.chapters[0].questions.map((q: { category: string }) => q.category))] }]
      const result = validate(EXPECTED, '--exams', writeTemp('exams.json', JSON.stringify(exams)))
      expect(result.status, result.stdout).toBe(0)
    })
  })
})
