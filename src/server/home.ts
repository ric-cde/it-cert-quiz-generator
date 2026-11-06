import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import type { ExamStatus, HomeExam, HomeOverview } from '../shared/selection'
import type { Db } from './db'
import { exams, quizzes, sources, subjects, userExams } from './db/schema'
import { labelOf } from './quiz'
import { progressOf } from '../shared/practice'
import { loadPool } from './selection'

/** The home page: subjects, their exams and each exam's sources with progress, and unfinished quizzes. */
export function homeOverview(db: Db, userId: number): HomeOverview {
  const subjectRows = db.select().from(subjects).orderBy(asc(subjects.id)).all()
  const examRows = db.select().from(exams).orderBy(asc(exams.id)).all()
  const sourceRows = db.select({ id: sources.id, examId: sources.examId, name: sources.name }).from(sources).orderBy(asc(sources.name)).all()

  const unfinished = db
    .select({ quiz: quizzes, exam: exams.name })
    .from(quizzes)
    .innerJoin(exams, eq(quizzes.examId, exams.id))
    .where(and(eq(quizzes.userId, userId), isNull(quizzes.finishedAt)))
    .orderBy(desc(quizzes.id))
    .all()

  const statuses = new Map(
    db
      .select()
      .from(userExams)
      .where(eq(userExams.userId, userId))
      .all()
      .map((row): [number, ExamStatus] => [row.examId, row.passedAt ? 'passed' : row.abandonedAt ? 'abandoned' : 'active']),
  )

  const examCards: (HomeExam & { subjectId: number })[] = examRows.map((exam) => {
    const pool = loadPool(db, userId, exam.id).questions
    return {
      id: exam.id,
      subjectId: exam.subjectId,
      name: exam.name,
      status: statuses.get(exam.id) ?? 'active',
      progress: progressOf(pool),
      sources: sourceRows
        .filter((source) => source.examId === exam.id)
        .map((source) => ({
          id: source.id,
          name: source.name,
          progress: progressOf(pool.filter((question) => question.sourceId === source.id)),
        })),
    }
  })
  const card = ({ subjectId: _, ...exam }: HomeExam & { subjectId: number }): HomeExam => exam

  return {
    subjects: subjectRows
      .map((subject) => ({
        id: subject.id,
        name: subject.name,
        exams: examCards.filter((exam) => exam.subjectId === subject.id && exam.status === 'active').map(card),
      }))
      .filter((subject) => subject.exams.length > 0),
    passed: examCards.filter((exam) => exam.status === 'passed').map(card),
    abandoned: examCards.filter((exam) => exam.status === 'abandoned').map(card),
    unfinished: unfinished.map(({ quiz, exam }) => ({
      id: quiz.id,
      exam,
      label: labelOf(db, quiz),
      feedback: quiz.config.feedback,
      position: quiz.position,
      total: quiz.questionIds.length,
      startedAt: quiz.startedAt.toISOString(),
    })),
  }
}

/** Marks an exam as passed or abandoned, or back to being studied. Each clears the other. */
export function setExamStatus(db: Db, userId: number, examId: number, status: ExamStatus) {
  if (!db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get()) return false
  const now = new Date()
  const values = { passedAt: status === 'passed' ? now : null, abandonedAt: status === 'abandoned' ? now : null }
  db.insert(userExams)
    .values({ userId, examId, ...values })
    .onConflictDoUpdate({ target: [userExams.userId, userExams.examId], set: values })
    .run()
  return true
}
