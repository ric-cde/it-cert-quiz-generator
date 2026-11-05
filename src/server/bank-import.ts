import { createHash } from 'node:crypto'
import { and, asc, count, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm'
import type { SourceTrust } from '../shared/domain'
import {
  type BankQuestion,
  type CategoryChoice,
  type CategoryStatus,
  defaultChoice,
  type ExamCategory,
  type ImportOptions,
  type ImportPlan,
  type ImportPreview,
  type ImportRejected,
  type ImportResult,
  isChoosable,
  type PlannedCategory,
  type PlannedQuestion,
  type SourceSummary,
} from '../shared/import'
import type { QuestionBank } from '../shared/question-bank'
import {
  type ExamCatalogue,
  normaliseText,
  questionFingerprint,
  questionWarnings,
  validateBank,
} from '../shared/question-bank-checks'
import type { Db, Tx } from './db'
import { countToReview } from './review'
import { remarkQuestion } from './tracking'
import {
  attempts,
  categories,
  categoryAliases,
  chapters,
  exams,
  explanations,
  options,
  questions,
  questionStats,
  sources,
} from './db/schema'

type Reader = Db | Tx
type QuestionRow = typeof questions.$inferSelect
type OptionRow = typeof options.$inferSelect
type CategoryRow = typeof categories.$inferSelect
type Origin = 'source' | 'generated'
type Explanation = { md: string | null; origin: Origin | null }
type IncomingExplanation = { explanationMd?: string; explanationOrigin?: Origin }

/**
 * Source text is ground truth, so text an AI wrote never replaces it. Anything else in the file
 * wins, and a blank in the file never wipes what's there.
 */
export function mergeExplanation(existing: Explanation, incoming: IncomingExplanation): Explanation & { heldBack: boolean } {
  if (incoming.explanationMd === undefined) return { ...existing, heldBack: false }
  const origin = incoming.explanationOrigin ?? 'source'
  // Text with no recorded origin came from a file before origins were tracked, so it counts as source.
  const protectedText = existing.md !== null && existing.origin !== 'generated'
  if (origin === 'generated' && protectedText) {
    return { ...existing, heldBack: existing.md !== incoming.explanationMd }
  }
  return { md: incoming.explanationMd, origin, heldBack: false }
}

const questionExplanationOf = (question: BankQuestion): IncomingExplanation =>
  question.type === 'free_form' ? {} : { explanationMd: question.explanationMd, explanationOrigin: question.explanationOrigin }

const contentHash = (question: BankQuestion) => createHash('sha256').update(questionFingerprint(question)).digest('hex')

/** The exams a file can be for. Its categories are matched separately, by `planCategories`. */
function loadCatalogue(db: Reader): ExamCatalogue {
  return db
    .select({ name: exams.name })
    .from(exams)
    .orderBy(asc(exams.id))
    .all()
    .map((exam) => ({ name: exam.name, categories: [] }))
}

const looseName = (name: string) => normaliseText(name)

/** Official categories, each followed by its topics, then anything added on import. */
function examCategoryList(rows: CategoryRow[]): ExamCategory[] {
  const describe = (row: CategoryRow): ExamCategory => ({
    id: row.id,
    name: row.name,
    parent: rows.find((other) => other.id === row.parentId)?.name ?? null,
    official: row.official,
  })
  const tops = rows.filter((row) => row.parentId === null)
  const ordered = [...tops.filter((row) => row.official), ...tops.filter((row) => !row.official)].flatMap((top) => [
    top,
    ...rows.filter((row) => row.parentId === top.id),
  ])
  return ordered.map(describe)
}

/**
 * Matches each category name in the file to the exam: exactly by name first, then by a name the
 * user mapped on an earlier import. Names that match neither wait for a choice, or its default.
 */
function planCategories(
  db: Reader,
  examId: number,
  bank: QuestionBank,
  choices: Record<string, CategoryChoice>,
) {
  const rows = db.select().from(categories).where(eq(categories.examId, examId)).orderBy(asc(categories.id)).all()
  const list = examCategoryList(rows)
  const byId = new Map(list.map((item) => [item.id, item]))
  const remembered = db.select().from(categoryAliases).where(eq(categoryAliases.examId, examId)).all()

  const counts = new Map<string, number>()
  for (const question of bank.chapters.flatMap((chapter) => chapter.questions)) {
    counts.set(question.category, (counts.get(question.category) ?? 0) + 1)
  }

  const planned: PlannedCategory[] = [...counts].map(([name, count]) => {
    const row = rows.find((item) => item.name === name)
    if (row) {
      const status: CategoryStatus = !row.official ? 'unofficial' : row.parentId === null ? 'official' : 'topic'
      return { name, count, status, target: byId.get(row.id) }
    }
    const mapped = remembered.find((item) => item.name === name)
    if (mapped) return { name, count, status: 'remembered', target: byId.get(mapped.categoryId) }

    const near =
      rows.find((item) => looseName(item.name) === looseName(name)) ??
      rows.find((item) => item.id === remembered.find((other) => looseName(other.name) === looseName(name))?.categoryId)
    return { name, count, status: 'new', ...(near ? { suggestion: byId.get(near.id) } : {}) }
  })

  const problems = Object.entries(choices).flatMap(([name, choice]) => {
    const category = planned.find((item) => item.name === name)
    if (!category || !isChoosable(category)) return []
    if ('map' in choice && !byId.has(choice.map)) {
      return [{ location: `Category "${name}"`, message: "The category chosen for it isn't one of this exam's." }]
    }
    return []
  })

  // A name maps to an id now, or to undefined when it becomes a new category on import.
  const resolved = new Map<string, number | undefined>()
  const decided = new Map<string, CategoryChoice>()
  for (const category of planned) {
    if (!isChoosable(category)) {
      resolved.set(category.name, category.target!.id)
      continue
    }
    const choice = choices[category.name] ?? defaultChoice(category)
    decided.set(category.name, choice)
    resolved.set(category.name, 'map' in choice ? choice.map : undefined)
  }

  return { planned, list, resolved, decided, problems }
}

function optionsByQuestion(db: Reader, questionIds: number[]) {
  const rows = questionIds.length
    ? db.select().from(options).where(inArray(options.questionId, questionIds)).orderBy(asc(options.position)).all()
    : []
  const map = new Map<number, OptionRow[]>()
  for (const row of rows) map.set(row.questionId, [...(map.get(row.questionId) ?? []), row])
  return map
}

const correctSet = (items: readonly { bodyMd: string; isCorrect: boolean }[]) =>
  JSON.stringify(
    items
      .filter((item) => item.isCorrect)
      .map((item) => normaliseText(item.bodyMd))
      .sort(),
  )

const optionsOf = (question: BankQuestion) => (question.type === 'free_form' ? [] : question.options)

/** The differences an update would make, in words. Empty means there's nothing to do. */
function describeChanges(incoming: BankQuestion, existing: QuestionRow, existingOptions: OptionRow[], moved: { category: boolean; chapter: boolean }) {
  const changes: string[] = []
  const live = existingOptions.filter((option) => !option.deletedAt)
  const incomingOptions = optionsOf(incoming)
  const model = incoming.type === 'free_form' ? incoming.modelAnswerMd : null
  const lock = incoming.type === 'free_form' ? false : Boolean(incoming.lockOptionOrder)

  if (incoming.type !== existing.type) changes.push('type')
  if (incoming.bodyMd !== existing.bodyMd || model !== existing.modelAnswerMd) changes.push('wording')
  if (JSON.stringify(incomingOptions.map((o) => o.bodyMd)) !== JSON.stringify(live.map((o) => o.bodyMd))) {
    changes.push('options')
  }
  if (correctSet(incomingOptions) !== correctSet(live)) changes.push('correct answer')

  // Compare what would be saved, so text the file can't replace isn't counted as a change.
  const byText = new Map(live.map((option) => [normaliseText(option.bodyMd), option]))
  const merges = [
    mergeExplanation(
      { md: existing.explanationMd, origin: existing.explanationOrigin },
      questionExplanationOf(incoming),
    ),
    ...incomingOptions.map((option) => {
      const match = byText.get(normaliseText(option.bodyMd))
      return mergeExplanation({ md: match?.explanationMd ?? null, origin: match?.explanationOrigin ?? null }, option)
    }),
  ]
  const before = [existing.explanationMd, ...incomingOptions.map((o) => byText.get(normaliseText(o.bodyMd))?.explanationMd ?? null)]
  if (merges.some((merge, index) => merge.md !== before[index])) changes.push('explanations')
  if (moved.category) changes.push('category')
  if (moved.chapter) changes.push('chapter')
  if (lock !== existing.lockOptionOrder) changes.push('option order lock')
  if (incoming.externalId && incoming.externalId !== existing.externalId) changes.push('ID')
  if ((incoming.reviewNote ?? null) !== existing.reviewNote) changes.push('review note')
  return { changes, heldBack: merges.filter((merge) => merge.heldBack).length }
}

type Plan = {
  preview: ImportPlan
  bank: QuestionBank
  examId: number
  sourceId: number | undefined
  categoryIds: Map<string, number | undefined>
  categoryChoices: Map<string, CategoryChoice>
  chapterIds: Map<string, number>
  matches: Map<PlannedQuestion, QuestionRow>
  existingOptions: Map<number, OptionRow[]>
}

function plan(db: Reader, raw: unknown, choices: Record<string, CategoryChoice> = {}): Plan | ImportRejected {
  const validation = validateBank(raw, loadCatalogue(db))
  if (!validation.ok) return validation
  const { bank, warnings } = validation

  const exam = db.select().from(exams).where(eq(exams.name, bank.exam)).get()!
  const categoryPlan = planCategories(db, exam.id, bank, choices)
  if (categoryPlan.problems.length > 0) return { ok: false, problems: categoryPlan.problems }
  const categoryIds = categoryPlan.resolved
  const source = db
    .select()
    .from(sources)
    .where(and(eq(sources.examId, exam.id), eq(sources.name, bank.source.name)))
    .get()
  const chapterRows = source ? db.select().from(chapters).where(eq(chapters.sourceId, source.id)).all() : []
  const chapterIds = new Map(chapterRows.map((chapter) => [chapter.name, chapter.id]))
  const chapterNames = new Map(chapterRows.map((chapter) => [chapter.id, chapter.name]))

  // Everything already in this exam, to find the same question again and to spot duplicates.
  const examQuestions = db
    .select({ question: questions, chapterName: chapters.name, sourceName: sources.name, sourceId: sources.id })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(sources, eq(chapters.sourceId, sources.id))
    .where(eq(sources.examId, exam.id))
    .all()
  const inSource = examQuestions.filter((row) => row.sourceId === source?.id)
  const byExternalId = new Map(
    inSource.filter((row) => row.question.externalId).map((row) => [row.question.externalId!, row.question]),
  )
  const existingOptions = optionsByQuestion(
    db,
    examQuestions.map((row) => row.question.id),
  )

  const matches = new Map<PlannedQuestion, QuestionRow>()
  const matched = new Set<number>()
  const seenInFile = new Map<string, { place: string; question: BankQuestion }>()
  const counts = { new: 0, updated: 0, unchanged: 0, deleted: 0, duplicates: 0, toReview: 0, total: 0 }

  const findMatch = (question: BankQuestion, hash: string) => {
    if (question.externalId) {
      const byId = byExternalId.get(question.externalId)
      if (byId) return byId
    }
    // With no ID to go on, the same text in this source is the same question. A question with an
    // ID only adopts a row that has none, because a different ID means a different question.
    return inSource.find(
      (row) =>
        row.question.contentHash === hash &&
        !matched.has(row.question.id) &&
        (!question.externalId || !row.question.externalId),
    )?.question
  }

  const planned = bank.chapters.map((chapter) => ({
    name: chapter.name,
    questions: chapter.questions.map((question, index) => {
      const hash = contentHash(question)
      const match = findMatch(question, hash)
      const place = `${chapter.name}, question ${index + 1}`
      const item: PlannedQuestion = { question, action: 'new', changes: [], warnings: questionWarnings(question) }

      if (match) {
        matched.add(match.id)
        matches.set(item, match)
        if (match.deletedAt) {
          item.action = 'deleted'
        } else {
          const { changes, heldBack } = describeChanges(question, match, existingOptions.get(match.id) ?? [], {
            category: categoryIds.get(question.category) !== match.categoryId,
            chapter: chapter.name !== chapterNames.get(match.chapterId),
          })
          item.changes = changes
          item.action = changes.length > 0 ? 'updated' : 'unchanged'
          if (heldBack > 0) {
            item.warnings.push(
              `Keeps the source's explanation for ${heldBack === 1 ? 'one part' : `${heldBack} parts`} of this question. The file's AI-written text there isn't used.`,
            )
          }
        }
      } else {
        const earlier = seenInFile.get(hash)
        const stored = examQuestions.find((row) => row.question.contentHash === hash && !row.question.deletedAt)
        if (earlier) {
          item.duplicateOf = {
            place: `${earlier.place} in this file`,
            answersDiffer: correctSet(optionsOf(question)) !== correctSet(optionsOf(earlier.question)),
          }
        } else if (stored) {
          const storedOptions = (existingOptions.get(stored.question.id) ?? []).filter((option) => !option.deletedAt)
          item.duplicateOf = {
            place: `${stored.sourceName}, ${stored.chapterName}`,
            answersDiffer: correctSet(optionsOf(question)) !== correctSet(storedOptions),
          }
        }
        if (item.duplicateOf) counts.duplicates += 1
      }
      if (question.reviewNote && item.action !== 'unchanged' && item.action !== 'deleted' && !item.duplicateOf) {
        counts.toReview += 1
      }

      if (!seenInFile.has(hash)) seenInFile.set(hash, { place, question })
      counts[item.action] += 1
      counts.total += 1
      return item
    }),
  }))

  return {
    bank,
    examId: exam.id,
    sourceId: source?.id,
    categoryIds,
    categoryChoices: categoryPlan.decided,
    chapterIds,
    matches,
    existingOptions,
    preview: {
      ok: true,
      exam: bank.exam,
      source: {
        name: bank.source.name,
        origin: bank.source.origin,
        trust: bank.source.trust ?? source?.trust ?? defaultTrust(bank),
        reference: bank.source.reference ?? source?.reference ?? null,
        exists: Boolean(source),
      },
      categories: categoryPlan.planned,
      examCategories: categoryPlan.list,
      chapters: planned,
      counts,
      omitted: bank.omitted ?? [],
      warnings,
      notInFile: inSource.filter((row) => !matched.has(row.question.id) && !row.question.deletedAt).length,
    },
  }
}

const defaultTrust = (bank: QuestionBank): SourceTrust | null => (bank.source.origin === 'generated' ? 'ai' : null)

/** Checks a file and reports what importing it would do. Saves nothing. */
export function previewImport(db: Db, raw: unknown): ImportPreview {
  const result = plan(db, raw)
  return 'preview' in result ? result.preview : result
}

function saveOptions(tx: Tx, questionId: number, incoming: BankQuestion, existing: OptionRow[]) {
  const unused = new Map(existing.map((option) => [normaliseText(option.bodyMd), option]))

  optionsOf(incoming).forEach((option, position) => {
    const key = normaliseText(option.bodyMd)
    const match = unused.get(key)
    unused.delete(key)
    const merged = mergeExplanation(
      { md: match?.explanationMd ?? null, origin: match?.explanationOrigin ?? null },
      option,
    )
    const explanation = { explanationMd: merged.md, explanationOrigin: merged.origin }
    if (match) {
      // The same row, so the option IDs recorded in past attempts still mean the same thing.
      tx.update(options)
        .set({ bodyMd: option.bodyMd, isCorrect: option.isCorrect, position, deletedAt: null, ...explanation })
        .where(eq(options.id, match.id))
        .run()
    } else {
      tx.insert(options)
        .values({ questionId, bodyMd: option.bodyMd, isCorrect: option.isCorrect, position, ...explanation })
        .run()
    }
  })

  const now = new Date()
  for (const option of unused.values()) {
    if (!option.deletedAt) tx.update(options).set({ deletedAt: now }).where(eq(options.id, option.id)).run()
  }
}

/** Saves a file, all or nothing. Checks it again, in case anything changed since the preview. */
export function commitImport(
  db: Db,
  raw: unknown,
  { includeDuplicates = false, limit, categoryChoices = {} }: ImportOptions = {},
): ImportResult | ImportRejected {
  return db.transaction((tx) => {
    const result = plan(tx, raw, categoryChoices)
    if (!('preview' in result)) return result
    const { preview, bank, examId, categoryIds, chapterIds, matches, existingOptions } = result

    // The file wins for these too, but leaving them out keeps what's there.
    const sourceDetails = {
      ...(bank.source.trust || !result.sourceId ? { trust: preview.source.trust } : {}),
      ...(bank.source.reference ? { reference: bank.source.reference } : {}),
    }
    const sourceId =
      result.sourceId ??
      tx.insert(sources).values({ examId, name: bank.source.name, origin: bank.source.origin, ...sourceDetails }).returning().get().id
    if (result.sourceId && Object.keys(sourceDetails).length > 0) {
      tx.update(sources).set(sourceDetails).where(eq(sources.id, sourceId)).run()
    }

    // Remember where mapped names go, so the next file from this source imports the same way.
    for (const [name, choice] of result.categoryChoices) {
      if ('map' in choice) {
        tx.insert(categoryAliases)
          .values({ examId, name, categoryId: choice.map })
          .onConflictDoUpdate({ target: [categoryAliases.examId, categoryAliases.name], set: { categoryId: choice.map } })
          .run()
      } else {
        tx.delete(categoryAliases).where(and(eq(categoryAliases.examId, examId), eq(categoryAliases.name, name))).run()
      }
    }
    // A name kept as it is becomes an unofficial category, when a question first needs it.
    const categoryId = (name: string) => {
      const known = categoryIds.get(name)
      if (known !== undefined) return known
      const id = tx.insert(categories).values({ examId, name, official: false }).returning().get().id
      categoryIds.set(name, id)
      return id
    }

    const outcome: ImportResult = {
      ok: true,
      sourceId,
      added: 0,
      updated: 0,
      unchanged: 0,
      skippedDuplicates: 0,
      skippedDeleted: 0,
      notImportedByLimit: 0,
      toReview: 0,
    }

    // Created only when a question needs one, so skipping duplicates can't leave an empty chapter.
    const chapterId = (name: string) => {
      const known = chapterIds.get(name)
      if (known) return known
      const id = tx.insert(chapters).values({ sourceId, name }).returning().get().id
      chapterIds.set(name, id)
      return id
    }

    let processed = 0
    for (const chapter of preview.chapters) {
      for (const item of chapter.questions) {
        if (limit !== undefined && processed >= limit) {
          outcome.notImportedByLimit += 1
          continue
        }
        processed += 1

        const { question } = item
        const fields = {
          categoryId: categoryId(question.category),
          type: question.type,
          bodyMd: question.bodyMd,
          modelAnswerMd: question.type === 'free_form' ? question.modelAnswerMd : null,
          lockOptionOrder: question.type === 'free_form' ? false : Boolean(question.lockOptionOrder),
          contentHash: contentHash(question),
          externalId: question.externalId ?? null,
          reviewNote: question.reviewNote ?? null,
          reviewedAt: null,
        }

        if (item.action === 'deleted') {
          outcome.skippedDeleted += 1
        } else if (item.action === 'unchanged') {
          outcome.unchanged += 1
        } else if (item.action === 'updated') {
          const match = matches.get(item)!
          // The file wins over any edits in the app, so a doubt it raises is open again. Flags stay,
          // because they're someone's verdict on the question rather than part of its content.
          const explanation = mergeExplanation(
            { md: match.explanationMd, origin: match.explanationOrigin },
            questionExplanationOf(question),
          )
          tx.update(questions)
            .set({
              ...fields,
              externalId: fields.externalId ?? match.externalId,
              chapterId: chapterId(chapter.name),
              explanationMd: explanation.md,
              explanationOrigin: explanation.origin,
            })
            .where(eq(questions.id, match.id))
            .run()
          saveOptions(tx, match.id, question, existingOptions.get(match.id) ?? [])
          remarkQuestion(tx, match.id)
          outcome.updated += 1
        } else if (item.duplicateOf && !includeDuplicates) {
          outcome.skippedDuplicates += 1
        } else {
          const explanation = mergeExplanation({ md: null, origin: null }, questionExplanationOf(question))
          const row = tx
            .insert(questions)
            .values({
              ...fields,
              chapterId: chapterId(chapter.name),
              explanationMd: explanation.md,
              explanationOrigin: explanation.origin,
            })
            .returning()
            .get()
          saveOptions(tx, row.id, question, [])
          outcome.added += 1
        }
      }
    }

    // A trial that added nothing, such as a file of only duplicates, shouldn't leave an empty source.
    if (!result.sourceId && chapterIds.size === 0) tx.delete(sources).where(eq(sources.id, sourceId)).run()
    return { ...outcome, toReview: countToReview(tx, sourceId) }
  })
}

export function listSources(db: Db): SourceSummary[] {
  const countQuestions = (where: SQL | undefined) =>
    db
      .select({ value: count() })
      .from(questions)
      .innerJoin(chapters, eq(questions.chapterId, chapters.id))
      .where(where)
      .get()!.value

  return db
    .select({
      id: sources.id,
      exam: exams.name,
      name: sources.name,
      origin: sources.origin,
      trust: sources.trust,
      reference: sources.reference,
    })
    .from(sources)
    .innerJoin(exams, eq(sources.examId, exams.id))
    .orderBy(asc(exams.id), asc(sources.name))
    .all()
    .map((source) => {
      const live = and(eq(chapters.sourceId, source.id), isNull(questions.deletedAt))
      return {
        ...source,
        chapters: db.select({ value: count() }).from(chapters).where(eq(chapters.sourceId, source.id)).get()!.value,
        questions: countQuestions(live),
        flagged: countQuestions(and(live, isNotNull(questions.flaggedAt))),
        toReview: countToReview(db, source.id),
        attempts: db
          .select({ value: count() })
          .from(attempts)
          .innerJoin(questions, eq(attempts.questionId, questions.id))
          .innerJoin(chapters, eq(questions.chapterId, chapters.id))
          .where(eq(chapters.sourceId, source.id))
          .get()!.value,
      }
    })
}

/**
 * Removes a source completely, for clearing out a trial import. A source with attempts is refused,
 * because attempts are history that must survive. Stage 8 adds soft deletion for those.
 */
export function deleteSource(db: Db, id: number): 'deleted' | 'not-found' | 'has-attempts' {
  return db.transaction((tx) => {
    if (!tx.select().from(sources).where(eq(sources.id, id)).get()) return 'not-found'

    const chapterIds = tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.sourceId, id))
      .all()
      .map((chapter) => chapter.id)
    const questionIds = chapterIds.length
      ? tx
          .select({ id: questions.id })
          .from(questions)
          .where(inArray(questions.chapterId, chapterIds))
          .all()
          .map((question) => question.id)
      : []

    if (questionIds.length > 0) {
      if (tx.select().from(attempts).where(inArray(attempts.questionId, questionIds)).limit(1).get()) {
        return 'has-attempts'
      }
      tx.delete(options).where(inArray(options.questionId, questionIds)).run()
      tx.delete(explanations).where(inArray(explanations.questionId, questionIds)).run()
      tx.delete(questionStats).where(inArray(questionStats.questionId, questionIds)).run()
      tx.delete(questions).where(inArray(questions.id, questionIds)).run()
    }
    tx.delete(chapters).where(eq(chapters.sourceId, id)).run()
    tx.delete(sources).where(eq(sources.id, id)).run()
    return 'deleted'
  })
}
