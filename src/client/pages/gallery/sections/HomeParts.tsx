import { ExamCard } from '@/components/ExamCard'
import { ExamIcon } from '@/components/ExamIcon'
import { EXAM_ICONS } from '@shared/exam-icons'
import { Specimen, SpecimenGrid } from '../kit'

export function HomeParts() {
  const progress = (correct: number, incorrect: number, total: number) => ({ correct, incorrect, total })
  return (
    <SpecimenGrid>
      <Specimen label="An exam with sources" className="col-span-full">
        <ExamCard
          exam={{
            id: 1,
            name: 'Java SE 21 Developer Professional (OCP)',
            subject: 'Java',
            status: 'active',
            progress: progress(140, 60, 320),
            sources: [
              { id: 1, name: 'OCP Study Guide (Boyarsky)', icon: 'fox', progress: progress(90, 30, 120) },
              { id: 2, name: 'Enthuware Practice Sets', icon: 'owl', progress: progress(50, 30, 200) },
            ],
          }}
          onStatus={() => {}}
        />
      </Specimen>
      <Specimen label="An exam with no questions yet" className="col-span-full">
        <ExamCard
          exam={{
            id: 2,
            name: 'Claude Developer Professional',
            subject: 'Claude',
            status: 'active',
            progress: progress(0, 0, 0),
            sources: [],
          }}
          onStatus={() => {}}
        />
      </Specimen>
      <Specimen label="Passed: lower on the page, with its own menu" className="col-span-full">
        <ExamCard
          exam={{
            id: 3,
            name: 'OutSystems Associate Developer (O11)',
            subject: 'OutSystems',
            status: 'passed',
            progress: progress(170, 10, 200),
            sources: [{ id: 3, name: 'Official practice exam', icon: 'penguin', progress: progress(170, 10, 200) }],
          }}
          onStatus={() => {}}
        />
      </Specimen>
      <Specimen label="An exam whose subject has no logo: a rosette" className="col-span-full">
        <ExamCard
          exam={{
            id: 4,
            name: 'PRINCE2 Foundation',
            subject: 'Project management',
            status: 'active',
            progress: progress(20, 5, 80),
            sources: [],
          }}
          onStatus={() => {}}
        />
      </Specimen>
      <Specimen label="Every exam icon, chosen from the subject's name" className="col-span-full">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
          {EXAM_ICONS.map((icon) => (
            <li key={icon.key} className="flex flex-col items-center gap-1.5 text-center text-xs text-ink-soft">
              <ExamIcon icon={icon.key} className="size-9" />
              {icon.name}
            </li>
          ))}
        </ul>
      </Specimen>
    </SpecimenGrid>
  )
}
