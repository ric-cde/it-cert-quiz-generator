import { CategoryBreakdown, ReviewEntryCard } from '@/components/QuizReview'
import { Specimen, SpecimenGrid } from '../kit'

const REVIEW_OPTIONS = (chosen: number | null) =>
  [
    {
      id: 1,
      label: null,
      bodyMd: '`List.of()` returns an immutable list',
      isCorrect: true,
      explanationMd: 'Adding to it throws `UnsupportedOperationException`.',
    },
    {
      id: 2,
      label: null,
      bodyMd: '`List.of()` allows `null` elements',
      isCorrect: false,
      explanationMd: 'It throws `NullPointerException` for a null element.',
    },
    { id: 3, label: null, bodyMd: '`List.of()` returns an `ArrayList`', isCorrect: false, explanationMd: null },
  ].map((option) => ({ ...option, chosen: option.id === chosen }))
export function ResultsParts() {
  const entry = {
    questionId: 1,
    type: 'single' as const,
    bodyMd: 'Which statement about `List.of()` is true?',
    source: 'OCP Study Guide (Boyarsky)',
    category: 'Working with Arrays and Collections',
    explanationMd: null,
    reviewNote: null,
  }
  return (
    <SpecimenGrid>
      <Specimen label="By category, weakest first" className="col-span-full">
        <CategoryBreakdown
          categories={[
            { name: 'Managing Concurrent Code Execution', correct: 1, asked: 4 },
            { name: 'Working with Streams and Lambda Expressions', correct: 3, asked: 5 },
            { name: 'Controlling Program Flow', correct: 6, asked: 6 },
          ]}
        />
      </Specimen>
      <Specimen label="Review answers: incorrect">
        <ReviewEntryCard entry={{ ...entry, number: 3, outcome: 'incorrect', options: REVIEW_OPTIONS(2) }} />
      </Specimen>
      <Specimen label="Review answers: correct">
        <ReviewEntryCard entry={{ ...entry, number: 4, outcome: 'correct', options: REVIEW_OPTIONS(1) }} />
      </Specimen>
      <Specimen label="Review answers: revealed">
        <ReviewEntryCard entry={{ ...entry, number: 5, outcome: 'revealed', options: REVIEW_OPTIONS(null) }} />
      </Specimen>
      <Specimen label="Review answers: skipped, with no text at all">
        <ReviewEntryCard
          entry={{
            ...entry,
            number: 6,
            outcome: 'skipped',
            options: REVIEW_OPTIONS(null).map((option) => ({ ...option, explanationMd: null })),
          }}
        />
      </Specimen>
    </SpecimenGrid>
  )
}
