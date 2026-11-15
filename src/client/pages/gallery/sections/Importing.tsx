import { useState } from 'react'
import { ChapterPreview, IssueList, QuestionPreview, TrustTag } from '@/components/BankPreview'
import { CategoryList } from '@/components/CategoryList'
import { FileDrop } from '@/components/FileDrop'
import { ReviewNotice } from '@/components/ReviewNotice'
import { SourceIcon, SourceIconPicker } from '@/components/SourceIcon'
import type { CategoryChoice, ExamCategory, PlannedQuestion } from '@shared/import'
import { iconName, SOURCE_ICON_KEYS } from '@shared/source-icons'
import { Specimen, SpecimenGrid } from '../kit'

const PREVIEW_SAMPLES: PlannedQuestion[] = [
  {
    action: 'new',
    changes: [],
    warnings: [],
    question: {
      externalId: 'mock-q1',
      type: 'single',
      category: 'A category',
      bodyMd: 'What does this print?\n\n```java\nSystem.out.println(1 + 1);\n```',
      options: [
        {
          bodyMd: '`2`',
          isCorrect: true,
          explanationMd: 'Correct! Both are numbers, so they add.',
          explanationOrigin: 'source',
        },
        {
          bodyMd: '`11`',
          isCorrect: false,
          explanationMd: 'This would need a `String` operand.',
          explanationOrigin: 'generated',
        },
      ],
    },
  },
  {
    action: 'updated',
    changes: ['wording', 'correct answer'],
    warnings: ['The question asks for 2 answers, but 1 marked correct.'],
    question: {
      type: 'multi',
      category: 'A category',
      bodyMd: 'Which are true? Choose two.',
      lockOptionOrder: true,
      reviewNote: 'The source marks only one answer.',
      options: [
        { bodyMd: 'The first', isCorrect: true },
        { bodyMd: 'All of the above', isCorrect: false },
      ],
    },
  },
  {
    action: 'new',
    changes: [],
    warnings: [],
    duplicateOf: { place: 'Mock source, Chapter 1', answersDiffer: true },
    question: {
      externalId: 'mock-q3',
      type: 'free_form',
      category: 'A category',
      bodyMd: 'Why are tests useful?',
      modelAnswerMd: 'They catch mistakes early, and make change safer.',
    },
  },
]
const GALLERY_EXAM_CATEGORIES: ExamCategory[] = [
  { id: 1, name: 'Fetching Data', parent: null, official: true },
  { id: 2, name: 'Aggregates', parent: 'Fetching Data', official: true },
  { id: 3, name: 'UI Design', parent: null, official: true },
  { id: 4, name: 'Performance', parent: null, official: false },
]
function CategoryMapping() {
  const [choices, setChoices] = useState<Record<string, CategoryChoice>>({
    'Form stuff': { keep: true },
    aggregates: { map: 2 },
  })
  return (
    <CategoryList
      categories={[
        { name: 'Fetching Data', count: 6, status: 'official', target: GALLERY_EXAM_CATEGORIES[0] },
        { name: 'Aggregates', count: 4, status: 'topic', target: GALLERY_EXAM_CATEGORIES[1] },
        { name: 'Performance', count: 1, status: 'unofficial', target: GALLERY_EXAM_CATEGORIES[3] },
        { name: 'Screens', count: 3, status: 'remembered', target: GALLERY_EXAM_CATEGORIES[2] },
        { name: 'aggregates', count: 2, status: 'new', suggestion: GALLERY_EXAM_CATEGORIES[1] },
        { name: 'Form stuff', count: 2, status: 'new' },
      ]}
      examCategories={GALLERY_EXAM_CATEGORIES}
      choices={{ Screens: { map: 3 }, ...choices }}
      onChoose={(name, choice) => setChoices((current) => ({ ...current, [name]: choice }))}
    />
  )
}
function IconPickerDemo() {
  const [icon, setIcon] = useState('fox')
  return (
    <div className="flex items-center gap-3">
      <SourceIconPicker icon={icon} choices={SOURCE_ICON_KEYS.slice(0, 40)} onChange={setIcon} />
      <p className="text-sm text-ink-soft">Chosen: {iconName(icon)}</p>
      <SourceIconPicker icon="owl" choices={['owl']} onChange={() => {}} disabled />
      <p className="text-sm text-ink-soft">Disabled while saving</p>
    </div>
  )
}
export function Importing() {
  const [chosen, setChosen] = useState<string>()
  return (
    <>
      <SpecimenGrid>
        <Specimen label="File drop">
          <FileDrop label="Choose a file" hint={chosen ?? 'Or drop one here'} onFile={(file) => setChosen(file.name)} />
        </Specimen>
        <Specimen label="With an error">
          <FileDrop label="Choose a file" error="This file seems to be cut off." onFile={() => {}} />
        </Specimen>
        <Specimen label="Disabled">
          <FileDrop label="Choose a file" disabled onFile={() => {}} />
        </Specimen>
      </SpecimenGrid>
      <Specimen label="Problems, which stop an import" className="mt-6">
        <IssueList
          tone="wrong"
          issues={[
            {
              location: 'Chapter 1, question 3 (q3), options',
              message: 'A single answer question needs exactly one correct option',
            },
          ]}
        />
      </Specimen>
      <Specimen label="Warnings" className="mt-6">
        <IssueList
          tone="amber"
          issues={[{ location: 'Chapter 1', message: "Question numbers 4, 5 are missing and aren't in omitted." }]}
        />
      </Specimen>
      <Specimen label="Categories in a file: the exam's own, and names to choose a place for" className="mt-6">
        <div className="max-w-2xl">
          <CategoryMapping />
        </div>
      </Specimen>
      <Specimen
        label="Source icon picker: click it to choose another. Only icons nobody else has are offered."
        className="mt-6"
      >
        <IconPickerDemo />
      </Specimen>
      <Specimen
        label="The whole icon set, in the order they're suggested, and the paw print shown when a source has none"
        className="mt-6"
      >
        <div className="flex flex-wrap gap-2">
          {SOURCE_ICON_KEYS.map((key) => (
            <span key={key} title={iconName(key)}>
              <SourceIcon icon={key} className="size-10" />
            </span>
          ))}
          <span title="No icon">
            <SourceIcon icon={null} className="size-10" />
          </span>
        </div>
      </Specimen>
      <Specimen label="How far a source can be trusted" className="mt-6">
        <p className="flex flex-wrap gap-2">
          <TrustTag trust="official" />
          <TrustTag trust="third_party" />
          <TrustTag trust="ai" />
        </p>
      </Specimen>
      <Specimen label="Left out" className="mt-6">
        <IssueList issues={[{ location: 'Practice exam 1, question 17', message: 'Depends on an image' }]} />
      </Specimen>
      <Specimen label="On a question in a quiz whose answer is in doubt, before answering" className="mt-6">
        <div className="max-w-2xl">
          <ReviewNotice answered={false} note="The source says 'a3', but this prints 'a12'." />
        </div>
      </Specimen>
      <Specimen label="The same question, once answered" className="mt-6">
        <div className="max-w-2xl">
          <ReviewNotice answered note="The source says 'a3', but this prints 'a12'." />
        </div>
      </Specimen>
      <Specimen label="Question previews: new, updated with warnings, and duplicate" className="mt-6">
        <div className="max-w-2xl space-y-3">
          {PREVIEW_SAMPLES.map((planned, index) => (
            <QuestionPreview key={index} planned={planned} />
          ))}
        </div>
      </Specimen>
      <Specimen label="A chapter. Open it to see its questions." className="mt-6">
        <div className="max-w-2xl">
          <ChapterPreview name="Chapter 1" questions={PREVIEW_SAMPLES} />
        </div>
      </Specimen>
    </>
  )
}
