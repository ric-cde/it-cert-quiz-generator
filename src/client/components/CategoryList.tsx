import clsx from 'clsx'
import type { CategoryChoice, CategoryStatus, ExamCategory, PlannedCategory } from '../../shared/import'
import { isChoosable } from '../../shared/import'
import { inputClass } from './Field'

const KEEP = 'keep'

const statusLabels: Record<CategoryStatus, string> = {
  official: 'Official category',
  topic: 'Official topic',
  unofficial: 'Added on an earlier import',
  remembered: 'Mapped on an earlier import',
  new: 'New to this exam',
}

export const categoryLabel = (category: ExamCategory) =>
  category.parent ? `${category.parent} › ${category.name}` : category.name

function Status({ status }: { status: CategoryStatus }) {
  const official = status === 'official' || status === 'topic'
  return (
    <span
      className={clsx(
        'rounded-full border px-2 py-px text-xs font-bold whitespace-nowrap',
        official && 'border-line-strong text-ink-soft',
        !official && status !== 'new' && 'border-accent text-accent-strong',
        status === 'new' && 'border-amber bg-amber-soft text-amber-ink',
      )}
    >
      {statusLabels[status]}
    </span>
  )
}

/**
 * Every category name in a file, and whether it's one of the exam's own. A name the exam doesn't
 * have can go into an existing category or topic, which merges it, or stay as a new unofficial one.
 */
export function CategoryList({
  categories,
  examCategories,
  choices,
  onChoose,
  disabled = false,
}: {
  categories: PlannedCategory[]
  examCategories: ExamCategory[]
  choices: Record<string, CategoryChoice>
  onChoose: (name: string, choice: CategoryChoice) => void
  disabled?: boolean
}) {
  const official = examCategories.filter((item) => item.official)
  const unofficial = examCategories.filter((item) => !item.official)

  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {categories.map((category) => {
        const choice = choices[category.name]
        const value = !choice || 'keep' in choice ? KEEP : String(choice.map)
        return (
          <li key={category.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <div className="min-w-0 flex-1 basis-56">
              <p className="font-semibold break-words">
                {category.name} <span className="font-normal text-ink-soft">({category.count})</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <Status status={category.status} />
                {category.status === 'topic' && category.target?.parent && <span>in {category.target.parent}</span>}
              </p>
            </div>
            {isChoosable(category) ? (
              <select
                aria-label={`Where questions in "${category.name}" go`}
                value={value}
                disabled={disabled}
                onChange={(event) =>
                  onChoose(
                    category.name,
                    event.target.value === KEEP ? { keep: true } : { map: Number(event.target.value) },
                  )
                }
                className={clsx(inputClass(), 'max-w-full min-w-0 flex-1 basis-56 text-sm')}
              >
                <option value={KEEP}>Keep as a new unofficial category</option>
                <optgroup label="Put into an official one">
                  {official.map((item) => (
                    <option key={item.id} value={item.id}>
                      {categoryLabel(item)}
                    </option>
                  ))}
                </optgroup>
                {unofficial.length > 0 && (
                  <optgroup label="Put into one added before">
                    {unofficial.map((item) => (
                      <option key={item.id} value={item.id}>
                        {categoryLabel(item)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              category.status === 'unofficial' && (
                <p className="text-xs text-ink-soft">Merging these comes with Manage, in Stage 8.</p>
              )
            )}
          </li>
        )
      })}
    </ul>
  )
}
