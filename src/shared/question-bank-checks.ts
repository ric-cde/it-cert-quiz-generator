import { type QuestionBank, questionBankSchema } from './question-bank'

/**
 * Everything checked about a question bank beyond its shape. The import screen and the skill's
 * validator (`scripts/skill-validate.ts`) both run this, so they can't disagree.
 *
 * Problems stop an import. Warnings are things that are probably mistakes, for a person to judge.
 */

export type BankIssue = { location: string; message: string }
/** The exams a file can be for. `topics` lists each category's official topics, where it has any. */
export type ExamCatalogue = { name: string; categories: string[]; topics?: Record<string, string[]> }[]

/** Every name the exam knows: its categories and their topics. */
export const knownCategoryNames = (exam: ExamCatalogue[number]) =>
  new Set([...exam.categories, ...Object.values(exam.topics ?? {}).flat()])

/** Category names the file uses that the exam doesn't have, with how many questions use each. */
export function unknownCategories(bank: QuestionBank, exam: ExamCatalogue[number]) {
  const known = knownCategoryNames(exam)
  const unknown = new Map<string, number>()
  for (const question of bank.chapters.flatMap((chapter) => chapter.questions)) {
    if (!known.has(question.category)) unknown.set(question.category, (unknown.get(question.category) ?? 0) + 1)
  }
  return unknown
}

export type BankValidation =
  | { ok: true; bank: QuestionBank; warnings: BankIssue[] }
  | { ok: false; problems: BankIssue[] }

type Question = QuestionBank['chapters'][number]['questions'][number]

export function questionLocation(chapter: string, index: number, question?: { externalId?: string }) {
  const id = question?.externalId ? ` (${question.externalId})` : ''
  return `${chapter}, question ${index + 1}${id}`
}

/** A readable place in the file, for a path from a schema error. */
function pathLocation(raw: unknown, path: PropertyKey[]) {
  const [first, chapterIndex, second, questionIndex, ...rest] = path
  if (first !== 'chapters' || typeof chapterIndex !== 'number') return path.join('.') || 'The file'

  const chapter = (raw as { chapters: { name?: unknown; questions?: { externalId?: string }[] }[] }).chapters[chapterIndex]
  const chapterName = typeof chapter?.name === 'string' ? chapter.name : `Chapter ${chapterIndex + 1}`
  if (second !== 'questions' || typeof questionIndex !== 'number') {
    return [chapterName, second].filter(Boolean).join(', ')
  }
  const place = questionLocation(chapterName, questionIndex, chapter?.questions?.[questionIndex])
  const [field, optionIndex, optionField] = rest
  if (field === 'options' && typeof optionIndex === 'number') {
    return `${place}, option ${optionIndex + 1}${optionField ? ` ${String(optionField)}` : ''}`
  }
  return field === undefined ? place : `${place}, ${String(field)}`
}

/** Text with its code removed, for checks that should only look at the prose. */
function proseOf(markdown: string) {
  return markdown
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[^\n]*$|(?![\s\S]))/gm, ' ')
    .replace(/`[^`\n]*`/g, ' ')
}

function codeOf(markdown: string) {
  return [...markdown.matchAll(/^ {0,3}(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^ {0,3}\1/gm)].map((match) => match[2]).join('\n')
}

export const normaliseText = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

/** Two questions with the same fingerprint are the same question, whatever order the options are in. */
export function questionFingerprint(question: Question) {
  const options = question.type === 'free_form' ? [] : question.options.map((option) => normaliseText(option.bodyMd)).sort()
  return JSON.stringify([normaliseText(question.bodyMd), options])
}

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 }

function fenceProblems(markdown: string) {
  const issues: string[] = []
  let open: string | undefined
  for (const line of markdown.split('\n')) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (!fence) continue
    const info = fence[2]!.trim()
    if (open === undefined) {
      open = fence[1]
      if (!info) issues.push("A code block doesn't name its language, so it won't be highlighted.")
    } else if (fence[1]!.startsWith(open) && !info) {
      open = undefined
    }
  }
  if (open !== undefined) issues.push('A code block is never closed, so the text after it will show as code.')
  return issues
}

function allText(question: Question) {
  if (question.type === 'free_form') return [question.bodyMd, question.modelAnswerMd]
  return [question.bodyMd, ...question.options.flatMap((option) => [option.bodyMd, option.explanationMd ?? ''])]
}

const IMAGE_REFERENCE =
  /!\[|\b(?:following|below|above|shown|this|the|attached)\s+(?:image|figure|diagram|screenshot|exhibit|picture)\b(?!\s+(?:widget|tag|element|file))/i

/** Likely mistakes in one question. */
export function questionWarnings(question: Question): string[] {
  const warnings: string[] = []
  const body = proseOf(question.bodyMd)
  const texts = allText(question)
  const allProse = texts.map(proseOf).join('\n')

  if (/^\s*(?:Q(?:uestion)?\.?\s*)?\d+\s*[.):]\s/i.test(question.bodyMd)) {
    warnings.push('The question seems to start with its number, which should be left out.')
  }
  if (IMAGE_REFERENCE.test(allProse)) {
    warnings.push("This may depend on an image, which the app can't show. If it does, move it to omitted.")
  }
  if (/\b(?:previous|preceding|next|last)\s+question\b|\bquestion\s+\d+\b/i.test(body)) {
    warnings.push('This seems to refer to another question, but questions are shown one at a time and in any order.')
  }
  if (/<\/?[A-Za-z][\w.,?\s]*>/.test(allProse)) {
    warnings.push('Text such as `<T>` outside backticks counts as HTML and disappears. Wrap it in backticks.')
  }
  if (/â€|Ã[\u0080-¿]|�|[ﬀ-ﬄ]/.test(texts.join('\n'))) {
    warnings.push('This contains garbled characters from extraction, such as â€ or ﬁ.')
  }
  if (/[“”‘’]/.test(texts.map(codeOf).join('\n'))) {
    warnings.push("A code block contains curly quotes, which wouldn't compile. They probably came from extraction.")
  }
  for (const text of new Set(texts.flatMap(fenceProblems))) warnings.push(text)

  if (question.type === 'free_form') return warnings

  const { options } = question
  const correct = options.filter((option) => option.isCorrect).length
  const asked = body
    .match(/\b(?:choose|select|pick|mark)\s+(?:any\s+|the\s+)?(two|three|four|five|six|[2-6])\b/i)?.[1]
    ?.toLowerCase()
  if (asked) {
    const wanted = NUMBER_WORDS[asked] ?? Number(asked)
    if (wanted !== correct) warnings.push(`The question asks for ${wanted} answers, but ${correct} marked correct.`)
  }
  if (question.type === 'single' && /\b(?:all that apply|(?:choose|select) all)\b/i.test(body)) {
    warnings.push('The question says to choose several, but its type is "single". It should probably be "multi".')
  }
  if (options.every((option) => /^\s*\(?[A-Za-z0-9][.)]\s/.test(option.bodyMd))) {
    warnings.push('Every option seems to start with a label such as "A.", which should be left out.')
  }
  if (new Set(options.map((option) => normaliseText(option.bodyMd))).size < options.length) {
    warnings.push('Two options have the same text.')
  }

  const optionProse = options.map((option) => proseOf(option.bodyMd)).join('\n')
  const explanations = options.map((option) => proseOf(option.explanationMd ?? '')).join('\n')
  if (
    /\b(?:options?|answers?|choices?)\s+[A-H]\b/.test(`${body}\n${explanations}`) ||
    /\b[A-H]\s+(?:and|or|&)\s+[A-H]\b/.test(optionProse)
  ) {
    warnings.push('This refers to an option by letter, but options have no letters and get shuffled. Refer to its content instead.')
  }
  if (
    !question.lockOptionOrder &&
    /\b(?:all|none|any|both|neither)\s+of\s+(?:the\s+)?(?:above|these|previous)\b|\b(?:the\s+)?above\b/i.test(optionProse)
  ) {
    warnings.push('An option seems to depend on the position of the others, such as "All of the above". Set lockOptionOrder.')
  }
  if (/\bthe\s+correct\s+answer\s+is\b|\bcorrect\s+answer\s*:|^\s*answer\s*:/im.test(`${body}\n${optionProse}`)) {
    warnings.push('The answer seems to be included in the question or option text.')
  }

  for (const option of options) {
    if (!option.explanationMd) {
      if (option.explanationOrigin) warnings.push('An option has an explanationOrigin but no explanationMd.')
      continue
    }
    const explanation = option.explanationMd.trim()
    const label = option.bodyMd.slice(0, 40)
    if (option.isCorrect && /^(?:incorrect|wrong|not correct)\b/i.test(explanation)) {
      warnings.push(`A correct option has an explanation calling it wrong, so the answer may be misaligned: "${label}".`)
    }
    if (!option.isCorrect && /^(?:correct|right)\b/i.test(explanation)) {
      warnings.push(`A wrong option has an explanation calling it correct, so the answer may be misaligned: "${label}".`)
    }
  }
  return warnings
}

// In a real exam the right answer is spread across positions. Most of them in one place suggests
// the options were reordered or the key was misread. With fewer questions, chance can do this.
const MIN_QUESTIONS_TO_JUDGE_SPREAD = 12
const SUSPICIOUS_SHARE = 0.6

/** Looks across the file for signs that something went wrong during conversion. */
function fileWarnings(bank: QuestionBank): BankIssue[] {
  const warnings: BankIssue[] = []

  const positions = new Map<number, number>()
  let singles = 0
  for (const question of bank.chapters.flatMap((chapter) => chapter.questions)) {
    if (question.type !== 'single' || question.lockOptionOrder) continue
    singles += 1
    const position = question.options.findIndex((option) => option.isCorrect)
    positions.set(position, (positions.get(position) ?? 0) + 1)
  }
  if (singles >= MIN_QUESTIONS_TO_JUDGE_SPREAD) {
    for (const [position, count] of positions) {
      if (count / singles > SUSPICIOUS_SHARE) {
        warnings.push({
          location: 'The whole file',
          message: `The correct answer is option ${position + 1} in ${count} of ${singles} single answer questions. Check the options kept their order and the answer key was matched properly.`,
        })
      }
    }
  }

  const omitted = (bank.omitted ?? []).map((item) => item.reference).join(' ')
  const seen = new Map<string, string>()
  for (const chapter of bank.chapters) {
    chapter.questions.forEach((question, index) => {
      const place = questionLocation(chapter.name, index, question)
      const fingerprint = questionFingerprint(question)
      const earlier = seen.get(fingerprint)
      if (earlier) warnings.push({ location: place, message: `This is the same question as ${earlier}.` })
      else seen.set(fingerprint, place)
    })

    // IDs usually carry the source's numbering, so a gap may be a question that got lost.
    const numbers = chapter.questions.map((question) => Number(question.externalId?.match(/(\d+)$/)?.[1] ?? Number.NaN))
    if (numbers.length < 2 || numbers.some(Number.isNaN)) continue
    const present = new Set(numbers)
    const missing: number[] = []
    for (let number = Math.min(...numbers); number < Math.max(...numbers); number++) {
      if (!present.has(number) && !new RegExp(`(?<!\\d)${number}(?!\\d)`).test(omitted)) missing.push(number)
    }
    if (missing.length > 0) {
      warnings.push({
        location: chapter.name,
        message: `Question numbers ${missing.join(', ')} are missing and aren't in omitted. Check nothing was lost.`,
      })
    }
  }
  return warnings
}

/** The full check of a parsed JSON value against the format and the app's exams. */
export function validateBank(raw: unknown, catalogue: ExamCatalogue): BankValidation {
  const parsed = questionBankSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((issue) => ({
        location: pathLocation(raw, issue.path),
        message: issue.message,
      })),
    }
  }

  const bank = parsed.data
  const exam = catalogue.find((item) => item.name === bank.exam)
  if (!exam) {
    const names = catalogue.map((item) => `"${item.name}"`).join(', ')
    return {
      ok: false,
      problems: [{ location: 'exam', message: `No exam is called "${bank.exam}". It must be exactly one of: ${names}.` }],
    }
  }

  const warnings = fileWarnings(bank)
  for (const chapter of bank.chapters) {
    chapter.questions.forEach((question, index) => {
      for (const message of questionWarnings(question)) {
        warnings.push({ location: questionLocation(chapter.name, index, question), message })
      }
    })
  }
  return { ok: true, bank, warnings }
}
