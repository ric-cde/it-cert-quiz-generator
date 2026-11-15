import { useState } from 'react'
import { FilterField, FilterPanel } from '@/components/FilterPanel'
import { LiveCount } from '@/components/LiveCount'
import { type MaxQuestions, MaxQuestionsPicker } from '@/components/MaxQuestions'
import { Segmented } from '@/components/Segmented'
import { StarButton } from '@/components/StarButton'
import { Switch } from '@/components/Switch'
import { Specimen, SpecimenGrid } from '../kit'

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'unsolved', label: 'Unsolved' },
] as const
const TYPE = [
  { value: 'all', label: 'All' },
  { value: 'mc', label: 'Multiple choice' },
  { value: 'free', label: 'Free-form' },
] as const
const SORT = [
  { value: 'random', label: 'Random' },
  { value: 'easiest', label: 'Easiest 1st' },
  { value: 'hardest', label: 'Hardest 1st' },
] as const
const FEEDBACK = [
  { value: 'each', label: 'After each question' },
  { value: 'end', label: 'At the end' },
] as const
export function FilterControls() {
  const [status, setStatus] = useState<(typeof STATUS)[number]['value']>('all')
  const [type, setType] = useState<(typeof TYPE)[number]['value']>('all')
  const [sort, setSort] = useState<(typeof SORT)[number]['value']>('random')
  const [feedback, setFeedback] = useState<(typeof FEEDBACK)[number]['value']>('each')
  const [max, setMax] = useState<MaxQuestions>(20)
  const [prioritise, setPrioritise] = useState(true)
  const [starred, setStarred] = useState(false)

  const available = 137
  const selected = max === 'max' ? available : Math.min(max, available)

  return (
    <>
      <Specimen label="Working example, with sample numbers">
        <FilterPanel footer={<LiveCount selected={selected} available={available} />}>
          <FilterField label="Status">
            <Segmented label="Status" value={status} options={STATUS} onChange={setStatus} />
          </FilterField>
          <FilterField label="Starred">
            <StarButton on={starred} label="Starred questions only" onChange={setStarred} />
          </FilterField>
          <FilterField label="Type">
            <Segmented label="Type" value={type} options={TYPE} onChange={setType} />
          </FilterField>
          <FilterField label="Max questions">
            <MaxQuestionsPicker value={max} onChange={setMax} />
          </FilterField>
          <FilterField label="Sort">
            <Segmented label="Sort" value={sort} options={SORT} onChange={setSort} />
          </FilterField>
          <FilterField label="Feedback">
            <Segmented label="Feedback" value={feedback} options={FEEDBACK} onChange={setFeedback} />
          </FilterField>
          <FilterField label="Prioritise">
            <Switch
              label={prioritise ? 'On' : 'Off'}
              hint="Wording to be revisited in Stage 7"
              checked={prioritise}
              onChange={setPrioritise}
            />
          </FilterField>
        </FilterPanel>
      </Specimen>
      <SpecimenGrid>
        <Specimen label="Live count as the bar along the bottom of the take-exam screen" className="col-span-full">
          <LiveCount selected={20} available={137} bar mix={{ correct: 4, incorrect: 3, unanswered: 13 }} />
        </Specimen>
        <Specimen
          label="The same with 349 questions: the squares shrink in steps, and stay square"
          className="col-span-full"
        >
          <LiveCount selected={349} available={349} bar mix={{ correct: 120, incorrect: 60, unanswered: 169 }} />
        </Specimen>
        <Specimen label="Status with a count on each option" className="col-span-full">
          <Segmented
            label="Status with counts"
            value="unanswered"
            options={[
              { value: 'all', label: 'All', count: 137 },
              { value: 'unanswered', label: 'Unanswered', count: 88 },
              { value: 'incorrect', label: 'Incorrect', count: 21 },
              { value: 'unsolved', label: 'Unsolved', count: 102 },
            ]}
          />
        </Specimen>
        <Specimen label="Live count, capped">
          <LiveCount selected={20} available={137} />
        </Specimen>
        <Specimen label="Live count, Max">
          <LiveCount selected={137} available={137} />
        </Specimen>
        <Specimen label="Live count, updating">
          <LiveCount selected={20} available={137} loading />
        </Specimen>
        <Specimen label="Live count, nothing matches">
          <LiveCount selected={0} available={0} />
        </Specimen>
        <Specimen label="Filter, disabled">
          <Segmented label="Disabled example" value="all" options={TYPE} disabled />
        </Specimen>
        <Specimen label="Switch states">
          <div className="space-y-2">
            <Switch label="On" checked />
            <Switch label="Off" checked={false} />
            <Switch label="Disabled" checked={false} disabled />
          </div>
        </Specimen>
      </SpecimenGrid>
    </>
  )
}
