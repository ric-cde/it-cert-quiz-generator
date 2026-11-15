import { DifficultyControl } from '@/components/DifficultyControl'
import { FlagButton, FlagReason } from '@/components/FlagControl'
import { QuizActions } from '@/components/QuizActions'
import { QuizProgress } from '@/components/QuizProgress'
import { QuizScore } from '@/components/QuizScore'
import { NoExplanation, QuestionExplanation } from '@/components/QuestionExplanation'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { Kbd } from '@/components/Kbd'
import { ReviewNotice } from '@/components/ReviewNotice'
import { StarButton } from '@/components/StarButton'
import { Verdict } from '@/components/Verdict'
import { Specimen, SpecimenGrid } from '../kit'

export function QuizParts() {
  const [flagged, setFlagged] = useState(false)
  const [starred, setStarred] = useState(false)
  const [difficulty, setDifficulty] = useState(5)
  return (
    <SpecimenGrid>
      <Specimen label="Quiz progress: one segment per question, coloured by how it went: correct, incorrect or skipped">
        <QuizProgress
          position={7}
          total={20}
          current={7}
          marks={['correct', 'correct', 'incorrect', 'correct', 'skipped', 'incorrect', 'correct']}
        />
      </Specimen>
      <Specimen label="Quiz progress: feedback at the end, where answered stays neutral and only a skip shows">
        <QuizProgress
          position={7}
          total={20}
          current={7}
          marks={['answered', 'answered', 'answered', 'answered', 'skipped', 'answered', 'answered']}
        />
      </Specimen>
      <Specimen label="Quiz progress: no marks given, so done is neutral">
        <QuizProgress position={7} total={20} current={7} />
      </Specimen>
      <Specimen label="Quiz progress: a short quiz, current question answered">
        <QuizProgress position={3} total={5} />
      </Specimen>
      <Specimen label="Quiz progress: 80 questions">
        <QuizProgress position={50} total={80} current={50} />
      </Specimen>
      <Specimen label="Quiz progress: over 120 questions, one line">
        <QuizProgress position={90} total={150} current={90} />
      </Specimen>
      <Specimen label="Flag: one press, and press again to unflag">
        <FlagButton flagged={flagged} onFlag={() => setFlagged(true)} onUnflag={() => setFlagged(false)} />
      </Specimen>
      <Specimen label="Star: an outline until pressed, then filled. Yours alone, and it changes nothing else">
        <StarButton on={starred} label="Star this question" onChange={setStarred} />
      </Specimen>
      <Specimen label="Difficulty (experimental): -1 and +1 move it a step, as do the down and up arrow keys">
        <DifficultyControl
          difficulty={difficulty}
          onChange={(change) => setDifficulty((now) => Math.min(Math.max(now + change, 0), 10))}
        />
      </Specimen>
      <Specimen label="Difficulty: at the top, so +1 is off">
        <DifficultyControl difficulty={10} onChange={() => {}} />
      </Specimen>
      <Specimen label="Difficulty: saving a step">
        <DifficultyControl difficulty={4} busy onChange={() => {}} />
      </Specimen>
      <Specimen label="Flagged: the reason opens below the action row">
        <FlagReason reason="Two options say the same thing" onSaveReason={() => {}} />
      </Specimen>
      <Specimen
        label="Action row: answering. Next's place is kept, so Star and Flag stay put"
        className="col-span-full"
      >
        <QuizActions
          tools={
            <>
              <StarButton on={starred} label="Star this question" onChange={setStarred} />
              <FlagButton flagged={false} onFlag={() => {}} onUnflag={() => {}} />
            </>
          }
        >
          <Button variant="primary" disabled>
            Submit
          </Button>
          <Button>
            Reveal answer <Kbd>R</Kbd>
          </Button>
        </QuizActions>
      </Specimen>
      <Specimen label="Action row: flagged while answering, with Skip" className="col-span-full">
        <QuizActions
          tools={<FlagButton flagged onFlag={() => {}} onUnflag={() => {}} />}
          end={<Button variant="ghost">Skip</Button>}
        >
          <Button variant="primary" disabled>
            Submit
          </Button>
          <Button>
            Reveal answer <Kbd>R</Kbd>
          </Button>
        </QuizActions>
      </Specimen>
      <Specimen label="Action row: answered" className="col-span-full">
        <QuizActions
          tools={
            <>
              <DifficultyControl
                difficulty={difficulty}
                onChange={(change) => setDifficulty((now) => Math.min(Math.max(now + change, 0), 10))}
              />
              <FlagButton flagged={false} onFlag={() => {}} onUnflag={() => {}} />
            </>
          }
          end={
            <Button variant="primary">
              Next <Kbd tone="on-accent">Enter</Kbd>
            </Button>
          }
        >
          <Verdict kind="incorrect" />
        </QuizActions>
      </Specimen>
      <Specimen label="Doubt: before answering">
        <ReviewNotice note="The source marks A, but B looks right." answered={false} />
      </Specimen>
      <Specimen label="Doubt: after answering">
        <ReviewNotice note="The source marks A, but B looks right." answered />
      </Specimen>
      <Specimen label="Explanation of the whole question" className="col-span-full">
        <QuestionExplanation markdown="Both use a reference type that the compiler can work out." />
      </Specimen>
      <Specimen label="Explanation written by AI" className="col-span-full">
        <QuestionExplanation markdown="`IsDataFetched` is True once the data has arrived." generated />
      </Specimen>
      <Specimen label="A missed question with no text anywhere">
        <NoExplanation />
      </Specimen>
      <Specimen label="Score" className="col-span-full">
        <QuizScore results={{ correct: 14, incorrect: 3, revealed: 2, skipped: 1, notReached: 0 }} />
      </Specimen>
      <Specimen label="Score: ended early" className="col-span-full">
        <QuizScore results={{ correct: 4, incorrect: 1, revealed: 0, skipped: 0, notReached: 15 }} />
      </Specimen>
      <Specimen label="Score: ended before answering anything" className="col-span-full">
        <QuizScore results={{ correct: 0, incorrect: 0, revealed: 0, skipped: 0, notReached: 20 }} />
      </Specimen>
    </SpecimenGrid>
  )
}
