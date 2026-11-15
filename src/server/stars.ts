import { and, eq, isNull } from 'drizzle-orm'
import type { Db, Tx } from './db'
import { questions, questionStars } from './db/schema'

/** Stars are each user's own: a way to mark questions to come back to. They change nothing else. */

const exists = (db: Db, questionId: number) =>
  db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, questionId), isNull(questions.deletedAt)))
    .get() !== undefined

const mine = (userId: number, questionId: number) =>
  and(eq(questionStars.userId, userId), eq(questionStars.questionId, questionId))

export const isStarred = (db: Pick<Tx, 'select'>, userId: number, questionId: number) =>
  db.select({ id: questionStars.questionId }).from(questionStars).where(mine(userId, questionId)).get() !== undefined

/** Starring twice keeps the first date. */
export function starQuestion(db: Db, userId: number, questionId: number) {
  if (!exists(db, questionId)) return false
  db.insert(questionStars).values({ userId, questionId }).onConflictDoNothing().run()
  return true
}

/** Fine to repeat: taking the star off a question that has none changes nothing. */
export function unstarQuestion(db: Db, userId: number, questionId: number) {
  if (!exists(db, questionId)) return false
  db.delete(questionStars).where(mine(userId, questionId)).run()
  return true
}
