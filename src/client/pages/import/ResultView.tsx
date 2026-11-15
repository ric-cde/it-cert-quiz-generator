import { Link } from 'react-router'
import { Button, buttonClass } from '@/components/Button'
import type { ImportResult } from '@shared/import'
import { plural } from '@/lib/quiz-words'
import { Card } from '@/components/Card'

export function ResultView({ result, onAnother }: { result: ImportResult; onAnother: () => void }) {
  const lines = [
    `${plural(result.added, 'question')} added`,
    result.updated > 0 && `${result.updated} updated`,
    result.unchanged > 0 && `${result.unchanged} unchanged`,
    result.skippedDuplicates > 0 && `${plural(result.skippedDuplicates, 'duplicate')} skipped`,
    result.skippedDeleted > 0 && `${result.skippedDeleted} kept deleted`,
    result.notImportedByLimit > 0 && `${result.notImportedByLimit} not imported in this trial`,
  ].filter(Boolean)

  return (
    <Card as="section" aria-label="Import result" padding="lg" className="mt-6">
      <h2 className="text-xl">Imported</h2>
      <p className="mt-1" role="status">
        {lines.join(', ')}.
      </p>
      {result.toReview > 0 && (
        <div className="mt-4 rounded-md border border-amber bg-amber-soft px-4 py-3">
          <p className="font-semibold">
            {plural(result.toReview, 'question')} in this source {result.toReview === 1 ? 'needs' : 'need'} your review
          </p>
          <p className="mb-2 text-sm">
            Something looked wrong, such as the source's answer. {result.toReview === 1 ? 'It stays' : 'They stay'} in
            quizzes with a warning until you decide.
          </p>
          <Link to={`/review?source=${result.sourceId}`} className={buttonClass({ variant: 'primary', size: 'sm' })}>
            Review {result.toReview === 1 ? 'it' : 'them'} now
          </Link>
        </div>
      )}
      {result.notImportedByLimit > 0 && (
        <p className="mt-2 text-sm text-ink-soft">
          Import the same file again at any time to add the rest. Questions already in won't be duplicated.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button onClick={onAnother}>Import another file</Button>
        <Link to="/dev/data/questions">See them in the data inspector</Link>
      </div>
    </Card>
  )
}

/** A URL becomes a link. Anything else, such as a book and edition, shows as text. */
