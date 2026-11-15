import { ProgressBar, ProgressSquares } from '@/components/ProgressBar'
import { Specimen, SpecimenGrid } from '../kit'

export function ProgressBars() {
  const bars: [string, number, number, number][] = [
    ['Never attempted', 0, 0, 80],
    ['Some correct', 24, 0, 80],
    ['Correct and attempted', 38, 17, 80],
    ['Only attempted, none right', 0, 30, 80],
    ['Attempted everything', 52, 28, 80],
    ['Complete', 80, 0, 80],
    ['199 of 200 reads 99%, not 100%', 199, 1, 200],
    ['No questions yet', 0, 0, 0],
  ]
  return (
    <SpecimenGrid>
      {bars.map(([label, correct, incorrect, total]) => (
        <Specimen key={label} label={label}>
          <ProgressBar label={label} correct={correct} incorrect={incorrect} total={total} />
        </Specimen>
      ))}
      <Specimen label="Muted (while All sources is selected)">
        <ProgressBar label="Muted" correct={38} incorrect={17} total={80} muted />
      </Specimen>
      <Specimen label="Status Unanswered: the empty part is striped and outlined">
        <ProgressBar label="Unanswered picked" correct={38} incorrect={17} total={80} emphasis="unanswered" />
      </Specimen>
      <Specimen label="Status Incorrect or Unsolved: the yellow part is striped and outlined">
        <ProgressBar label="Incorrect picked" correct={38} incorrect={17} total={80} emphasis="incorrect" />
      </Specimen>
      <Specimen label="Without the figure, as on tiles">
        <ProgressBar label="No figure" correct={38} incorrect={17} total={80} showPercent={false} />
      </Specimen>
      <Specimen label="Squares: one for each question">
        <ProgressSquares label="Squares" correct={14} incorrect={6} total={28} />
      </Specimen>
      <Specimen label="Squares, status Unanswered: striped with a white outline">
        <ProgressSquares
          label="Squares, unanswered picked"
          correct={14}
          incorrect={6}
          total={28}
          emphasis="unanswered"
        />
      </Specimen>
      <Specimen label="Squares, status Incorrect or Unsolved">
        <ProgressSquares label="Squares, incorrect picked" correct={14} incorrect={6} total={28} emphasis="incorrect" />
      </Specimen>
      <Specimen label="Squares, muted">
        <ProgressSquares label="Squares, muted" correct={14} incorrect={6} total={28} muted />
      </Specimen>
      <Specimen label="Squares: 120 questions, a size smaller">
        <ProgressSquares label="Squares, 120" correct={40} incorrect={22} total={120} emphasis="unanswered" />
      </Specimen>
      <Specimen label="Squares: 349 questions, the smallest">
        <ProgressSquares label="Squares, 349" correct={120} incorrect={60} total={349} />
      </Specimen>
      <Specimen label="Squares: no questions yet">
        <ProgressSquares label="Squares, none" correct={0} incorrect={0} total={0} />
      </Specimen>
    </SpecimenGrid>
  )
}
