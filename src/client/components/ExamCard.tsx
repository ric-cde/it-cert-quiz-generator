import clsx from 'clsx'
import { ArrowRight, Ellipsis, GraduationCap } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Link } from 'react-router'
import type { ExamStatus, HomeExam } from '../../shared/selection'
import { buttonClass } from './Button'
import { ProgressBar } from './ProgressBar'

const ACTIONS: Record<ExamStatus, { label: string; status: ExamStatus }[]> = {
  active: [
    { label: 'Mark as passed', status: 'passed' },
    { label: 'Abandon this exam', status: 'abandoned' },
  ],
  passed: [{ label: 'Not passed after all', status: 'active' }],
  abandoned: [{ label: 'Study this again', status: 'active' }],
}

/** Passing or abandoning an exam moves it down the home page, and either can be undone here. */
function ExamMenu({ exam, onStatus }: { exam: HomeExam; onStatus: (status: ExamStatus) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={buttonClass({ size: 'sm', variant: 'ghost', iconOnly: true })}
        aria-label={`More for ${exam.name}`}
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-30 min-w-44 animate-rise rounded-md border border-line bg-surface p-1 shadow-raised"
        >
          {ACTIONS[exam.status].map((action) => (
            <DropdownMenu.Item
              key={action.status}
              onSelect={() => onStatus(action.status)}
              className="cursor-pointer rounded-sm px-2.5 py-1.5 text-sm outline-none data-highlighted:bg-accent-soft data-highlighted:text-accent-strong"
            >
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** An exam on the home page: its progress, each source's progress, and the way into practice. */
export function ExamCard({ exam, onStatus }: { exam: HomeExam; onStatus?: (status: ExamStatus) => void }) {
  const empty = exam.progress.total === 0
  return (
    <article
      aria-labelledby={`exam-${exam.id}`}
      className={clsx(
        'relative rounded-lg border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow] duration-100 sm:p-5',
        !empty && 'hover:border-accent/60 hover:shadow-raised',
      )}
    >
      {!empty && (
        // A click anywhere on the card opens the exam. Practise is the same link for keyboards and
        // screen readers, so this one is hidden from them. It has to be separate from the button,
        // because a pressed button shifts down a pixel, which would shrink an overlay drawn from it.
        <Link to={`/exam/${exam.id}`} aria-hidden="true" tabIndex={-1} className="absolute inset-0 rounded-lg" />
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id={`exam-${exam.id}`} className="text-lg leading-snug break-words">
            {exam.name}
            {exam.status === 'passed' && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-xs font-bold text-accent-strong">
                <GraduationCap className="size-3.5" aria-hidden="true" /> Passed
              </span>
            )}
          </h3>
          <p className="text-xs text-ink-soft">
            {empty ? 'No questions yet' : `${exam.progress.total} ${exam.progress.total === 1 ? 'question' : 'questions'}`}
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-1.5">
          {empty ? (
            <Link to="/import" className={buttonClass({ size: 'sm' })}>
              Import questions
            </Link>
          ) : (
            <Link
              to={`/exam/${exam.id}`}
              aria-label={`Practise ${exam.name}`}
              className={buttonClass({ variant: exam.status === 'active' ? 'primary' : 'secondary', size: 'sm' })}
            >
              Practise <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          {onStatus && <ExamMenu exam={exam} onStatus={onStatus} />}
        </div>
      </div>

      {!empty && (
        <>
          {/* Above the card's link, so hovering the bar shows its tooltips. */}
          <div className="relative z-10 mt-3">
            <ProgressBar {...exam.progress} label={`${exam.name} progress`} />
          </div>
          {exam.sources.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-line pt-2" aria-label={`Sources for ${exam.name}`}>
              {exam.sources.map((source) => (
                <li
                  key={source.id}
                  className="relative z-10 -mx-2 grid gap-x-4 gap-y-1 rounded-md px-2 py-1 hover:bg-accent-soft sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center"
                >
                  {/* Stretched over the row, above the card's own link, to open the exam with just this source picked. */}
                  <Link
                    to={`/exam/${exam.id}?sources=${source.id}`}
                    title="Practise this source"
                    className="min-w-0 text-sm break-words text-ink after:absolute after:inset-0 after:rounded-md after:content-[''] hover:text-ink"
                  >
                    {source.name}
                  </Link>
                  <div className="relative z-10">
                    <ProgressBar {...source.progress} label={`${source.name} progress`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  )
}
