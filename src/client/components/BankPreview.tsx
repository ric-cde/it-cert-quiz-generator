import clsx from 'clsx'
import { useId, useState } from 'react'
import type { SourceTrust } from '../../shared/domain'
import type { ImportAction, PlannedQuestion } from '../../shared/import'
import type { BankIssue } from '../../shared/question-bank-checks'
import { AnswerOption } from './AnswerOption'
import { Markdown } from './Markdown'
import { QuestionExplanation } from './QuestionExplanation'

const trustLabels: Record<SourceTrust, string> = { official: 'Official', third_party: 'Third-party', ai: 'Written by AI' }

/** How far a source can be trusted. Official material stands out, because it's the ground truth. */
export function TrustTag({ trust }: { trust: SourceTrust }) {
  return (
    <span
      className={clsx(
        'rounded-full border px-2 py-px text-xs font-bold whitespace-nowrap',
        trust === 'official' ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line-strong text-ink-soft',
      )}
    >
      {trustLabels[trust]}
    </span>
  )
}

/** Problems, warnings or questions left out, each with where it is in the file. */
export function IssueList({ issues, tone = 'plain' }: { issues: BankIssue[]; tone?: 'plain' | 'amber' | 'wrong' }) {
  return (
    <ul
      className={clsx(
        'space-y-2 rounded-md border px-4 py-3 text-sm',
        tone === 'plain' && 'border-line bg-surface',
        tone === 'amber' && 'border-amber bg-amber-soft',
        tone === 'wrong' && 'border-wrong bg-wrong-soft',
      )}
    >
      {issues.map((issue, index) => (
        <li key={index} className="break-words">
          <span className="font-semibold">{issue.location}:</span> {issue.message}
        </li>
      ))}
    </ul>
  )
}

const actionLabels: Record<ImportAction, string> = {
  new: 'New',
  updated: 'Updated',
  unchanged: 'Unchanged',
  deleted: 'Deleted in the app',
}

function Tag({ tone = 'plain', children }: { tone?: 'plain' | 'amber'; children: string }) {
  return (
    <span
      className={clsx(
        'rounded-full border px-2 py-px text-xs font-bold whitespace-nowrap',
        tone === 'amber' ? 'border-amber bg-amber-soft text-amber-ink' : 'border-line-strong text-ink-soft',
      )}
    >
      {children}
    </span>
  )
}

/** One question as it would appear with its answer showing, plus what importing would do to it. */
export function QuestionPreview({ planned }: { planned: PlannedQuestion }) {
  const name = useId()
  const { question, action, changes, duplicateOf, warnings } = planned
  const notes = [
    ...(question.reviewNote ? [`Why it needs review: ${question.reviewNote}`] : []),
    ...(duplicateOf
      ? [
          `Duplicate of ${duplicateOf.place}.${duplicateOf.answersDiffer ? ' The two have different correct answers.' : ''}`,
        ]
      : []),
    ...warnings,
  ]

  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Tag>{action === 'updated' ? `Updated: ${changes.join(', ')}` : actionLabels[action]}</Tag>
        {duplicateOf && <Tag tone="amber">Duplicate</Tag>}
        {question.reviewNote && <Tag tone="amber">To review</Tag>}
        <span className="min-w-0 text-xs break-words text-ink-soft">
          {question.category}
          {question.externalId && ` · ${question.externalId}`}
        </span>
      </div>

      <Markdown>{question.bodyMd}</Markdown>

      {question.type === 'free_form' ? (
        <div className="mt-3 rounded-md border border-line bg-sunken px-3.5 py-3">
          <p className="mb-1 text-xs font-bold text-ink-soft">Model answer</p>
          <Markdown>{question.modelAnswerMd}</Markdown>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {question.options.map((option, index) => (
            <AnswerOption
              key={index}
              kind={question.type === 'multi' ? 'multi' : 'single'}
              name={name}
              state={option.isCorrect ? 'correct-missed' : 'neutral'}
              explanation={
                option.explanationMd && (
                  <>
                    <Markdown>{option.explanationMd}</Markdown>
                    {option.explanationOrigin === 'generated' && <span className="text-xs italic">Written by AI</span>}
                  </>
                )
              }
            >
              <Markdown>{option.bodyMd}</Markdown>
            </AnswerOption>
          ))}
          {question.lockOptionOrder && <p className="text-xs text-ink-soft">Options stay in this order.</p>}
          {question.explanationMd && (
            <QuestionExplanation markdown={question.explanationMd} generated={question.explanationOrigin === 'generated'} />
          )}
        </div>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-md border border-amber bg-amber-soft px-3.5 py-2 text-sm">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

/** A chapter's questions, drawn only when opened, because a large bank has a lot of code to highlight. */
export function ChapterPreview({ name, questions }: { name: string; questions: PlannedQuestion[] }) {
  const [open, setOpen] = useState(false)
  const warnings = questions.reduce((total, item) => total + item.warnings.length, 0)
  return (
    <details
      className="rounded-lg border border-line bg-paper"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer rounded-lg px-4 py-3 font-semibold focus-ring:outline-2 focus-ring:outline-offset-2 focus-ring:outline-accent">
        {name}{' '}
        <span className="text-sm font-normal text-ink-soft">
          {questions.length} question{questions.length === 1 ? '' : 's'}
          {warnings > 0 && `, ${warnings} warning${warnings === 1 ? '' : 's'}`}
        </span>
      </summary>
      {open && (
        <div className="space-y-3 border-t border-line p-3">
          {questions.map((item, index) => (
            <QuestionPreview key={index} planned={item} />
          ))}
        </div>
      )}
    </details>
  )
}
