import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from './db'
import { questions } from './db/schema'

/** Flagging keeps the first date. Without a reason, any reason already given stays. */
export function flagQuestion(db: Db, questionId: number, reason?: string) {
  const question = db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), isNull(questions.deletedAt)))
    .get()
  if (!question) return false
  db.update(questions)
    .set({
      flaggedAt: question.flaggedAt ?? new Date(),
      flagReason: reason === undefined ? question.flagReason : reason || null,
    })
    .where(eq(questions.id, questionId))
    .run()
  return true
}

export function unflagQuestion(db: Db, questionId: number) {
  return (
    db.update(questions).set({ flaggedAt: null, flagReason: null }).where(eq(questions.id, questionId)).run().changes >
    0
  )
}
