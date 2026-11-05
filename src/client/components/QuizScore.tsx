import type { QuizResults } from '../../shared/quiz'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** A skipped or revealed question counts against the score. One you never reached doesn't. */
export function quizScore({ correct, incorrect, revealed, skipped }: QuizResults) {
  const asked = correct + incorrect + revealed + skipped
  return { asked, percent: asked > 0 ? Math.floor((correct / asked) * 100) : 0 }
}

export function QuizScore({ results }: { results: QuizResults }) {
  const { asked, percent } = quizScore(results)
  const details = [
    results.incorrect > 0 && `${results.incorrect} incorrect`,
    results.revealed > 0 && `${results.revealed} revealed`,
    results.skipped > 0 && `${results.skipped} skipped`,
    results.notReached > 0 && `${plural(results.notReached, 'question')} not reached`,
  ].filter(Boolean)

  return (
    <div>
      {asked > 0 ? (
        <p className="text-2xl font-bold">
          {results.correct} of {asked} correct <span className="font-normal text-ink-soft">({percent}%)</span>
        </p>
      ) : (
        <p className="text-2xl font-bold">No questions answered</p>
      )}
      {details.length > 0 && <p className="mt-1 text-sm text-ink-soft">{details.join(', ')}</p>}
    </div>
  )
}
