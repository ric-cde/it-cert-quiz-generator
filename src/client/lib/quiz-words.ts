import type { Feedback, QuizSort } from '../../shared/domain'
import type { Status } from '../../shared/selection'

/** The words the screens use for quiz options, kept in one place so they always match. */

export const FEEDBACK_NAMES: Record<Feedback, string> = { after_each: 'After each question', at_end: 'At the end' }

export const SORT_OPTIONS: readonly { value: QuizSort; label: string }[] = [
  { value: 'random', label: 'Random' },
  { value: 'source', label: 'Source order' },
]

export const STATUS_OPTIONS: readonly { value: Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'unsolved', label: 'Unsolved' },
]

const twoDigits = (value: number) => String(value).padStart(2, '0')

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * When a quiz started, kept short because unfinished quizzes are days or weeks old: "18:35 · Tue"
 * within the last week, otherwise "18:35 · Nov 19". Local time.
 */
export function formatStarted(iso: string, now = new Date()) {
  const date = new Date(iso)
  const time = `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  const day = daysAgo >= 0 && daysAgo < 7 ? DAYS[date.getDay()] : `${MONTHS[date.getMonth()]} ${date.getDate()}`
  return `${time} · ${day}`
}
