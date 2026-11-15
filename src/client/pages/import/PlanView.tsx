import { useState } from 'react'
import { ChapterPreview, IssueList, TrustTag } from '@/components/BankPreview'
import { Button } from '@/components/Button'
import { CategoryList } from '@/components/CategoryList'
import { Switch } from '@/components/Switch'
import { SourceIconPicker } from '@/components/SourceIcon'
import type { CategoryChoice, ImportOptions, ImportPlan } from '@shared/import'
import { defaultChoice, isChoosable, SAMPLE_IMPORT_SIZE } from '@shared/import'
import { SAME_TEXT_WARNING } from '@shared/question-bank-checks'
import { iconName } from '@shared/source-icons'
import { plural } from '@/lib/quiz-words'
import { SourceReference } from './SourceList'
import { Card } from '@/components/Card'
import { useFeature } from '@/lib/features'

function Summary({ plan }: { plan: ImportPlan }) {
  const { counts } = plan
  const stats: [string, number][] = [
    ['New', counts.new - counts.duplicates],
    ['Updated', counts.updated],
    ['Unchanged', counts.unchanged],
    ['Duplicates', counts.duplicates],
    ['To review', counts.toReview],
    ['Left out', plan.omitted.length],
  ]
  return (
    <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-md border border-line bg-surface px-3 py-2">
          <dt className="text-xs text-ink-soft">{label}</dt>
          <dd className="text-xl font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PlanView({
  plan,
  saving,
  onImport,
  onCancel,
}: {
  plan: ImportPlan
  saving: boolean
  onImport: (options: ImportOptions) => void
  onCancel: () => void
}) {
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [icon, setIcon] = useState(plan.source.icon)
  const icons = useFeature('sourceIcons')
  const [categoryChoices, setCategoryChoices] = useState<Record<string, CategoryChoice>>(() =>
    Object.fromEntries(plan.categories.filter(isChoosable).map((category) => [category.name, defaultChoice(category)])),
  )
  const { counts } = plan
  const toDecide = plan.categories.filter((category) => category.status === 'new').length
  const toImport = counts.new - (includeDuplicates ? 0 : counts.duplicates) + counts.updated

  return (
    <section aria-label="Preview" className="mt-6">
      <div className="flex items-center gap-3">
        {icons && (
          <SourceIconPicker icon={icon} choices={plan.source.iconChoices} disabled={saving} onChange={setIcon} />
        )}
        <div className="min-w-0">
          <h2 className="text-xl break-words">{plan.source.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {plan.exam}.{' '}
            {plan.source.exists ? 'This source already exists, so these add to it.' : 'This will be a new source.'}{' '}
            Nothing is saved yet.{icons && ` Its icon is ${iconName(icon).toLowerCase()}. Click it to choose another.`}
          </p>
        </div>
      </div>
      {(plan.source.trust || plan.source.reference) && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {plan.source.trust && <TrustTag trust={plan.source.trust} />}
          {plan.source.reference && <SourceReference reference={plan.source.reference} />}
        </p>
      )}

      <Summary plan={plan} />

      {counts.deleted > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          {plural(counts.deleted, 'question')} deleted in the app will stay deleted.
        </p>
      )}
      {plan.notInFile > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          {plural(plan.notInFile, 'question')} already in this source {plan.notInFile === 1 ? "isn't" : "aren't"} in
          this file, and will be left alone.
        </p>
      )}

      {plan.warnings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base">{plural(plan.warnings.length, 'warning')}</h3>
          <p className="mb-2 text-sm text-ink-soft">
            These are probably mistakes, but won't stop the import.
            {plan.warnings.some((warning) => warning.message === SAME_TEXT_WARNING) &&
              ' Some might be false alarms: the same-text check ignores capital letters, so options such as "Long" and "long" are flagged even though they differ.'}
          </p>
          <IssueList issues={plan.warnings} tone="amber" />
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-base">Categories</h3>
        <p className="mb-2 text-sm text-ink-soft">
          {toDecide > 0
            ? `${plural(toDecide, 'name')} ${toDecide === 1 ? "isn't" : "aren't"} one of this exam's. Choose where each goes. Your choice is remembered for next time.`
            : 'Every name in this file is already known to this exam.'}
        </p>
        <CategoryList
          categories={plan.categories}
          examCategories={plan.examCategories}
          choices={categoryChoices}
          disabled={saving}
          onChoose={(name, choice) => setCategoryChoices((current) => ({ ...current, [name]: choice }))}
        />
      </div>

      {plan.omitted.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base">Left out of this file</h3>
          <p className="mb-2 text-sm text-ink-soft">These questions from the source won't be in the app.</p>
          <IssueList issues={plan.omitted.map((item) => ({ location: item.reference, message: item.reason }))} />
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-base">Questions</h3>
        <div className="space-y-2">
          {plan.chapters.map((chapter) => (
            <ChapterPreview key={chapter.name} name={chapter.name} questions={chapter.questions} />
          ))}
        </div>
      </div>

      <Card padding="sm" className="mt-6">
        {counts.duplicates > 0 && (
          <div className="mb-4">
            <Switch
              label={`Also import ${plural(counts.duplicates, 'duplicate')}`}
              checked={includeDuplicates}
              onChange={setIncludeDuplicates}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            loading={saving}
            disabled={toImport === 0}
            onClick={() => onImport({ includeDuplicates, categoryChoices, icon })}
          >
            {toImport === 0 ? 'Nothing to import' : `Import ${plural(toImport, 'question')}`}
          </Button>
          {counts.total > SAMPLE_IMPORT_SIZE && (
            <Button
              disabled={saving}
              onClick={() => onImport({ includeDuplicates, categoryChoices, icon, limit: SAMPLE_IMPORT_SIZE })}
            >
              Try the first {SAMPLE_IMPORT_SIZE} only
            </Button>
          )}
          <Button variant="ghost" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Card>
    </section>
  )
}
