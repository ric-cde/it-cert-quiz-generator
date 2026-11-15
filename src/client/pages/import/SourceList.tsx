import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { TrustTag } from '@/components/BankPreview'
import { Button } from '@/components/Button'
import { SourceIcon } from '@/components/SourceIcon'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'
import type { SourceSummary } from '@shared/import'
import { iconName } from '@shared/source-icons'
import { ErrorText } from '@/components/Notices'
import { plural } from '@/lib/quiz-words'
import { failureMessage } from './messages'
import { Card } from '@/components/Card'

export function SourceReference({ reference }: { reference: string }) {
  if (/^https?:\/\/\S+$/.test(reference)) {
    return (
      <a href={reference} target="_blank" rel="noreferrer" className="break-all">
        {reference}
      </a>
    )
  }
  return <span className="break-words">{reference}</span>
}

function SourceRow({ source }: { source: SourceSummary }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({
    mutationFn: async () => readJson(await api.api.sources[':id'].$delete({ param: { id: String(source.id) } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  })

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span title={source.icon ? iconName(source.icon) : undefined}>
          <SourceIcon icon={source.icon} className="mt-0.5 size-8" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold break-words">
            {source.name} {source.trust && <TrustTag trust={source.trust} />}
          </p>
          {source.reference && (
            <p className="text-sm text-ink-soft">
              <SourceReference reference={source.reference} />
            </p>
          )}
          <p className="text-sm break-words text-ink-soft">
            {source.exam}. {plural(source.chapters, 'chapter')}, {plural(source.questions, 'question')}
            {source.flagged > 0 && `, ${source.flagged} flagged`}
          </p>
          {source.toReview > 0 && (
            <p className="text-sm">
              <Link to={`/review?source=${source.id}`}>{plural(source.toReview, 'question')} to review</Link>
            </p>
          )}
          {remove.isError && <ErrorText>{failureMessage(remove.error)}</ErrorText>}
        </div>
      </div>
      {source.attempts > 0 ? (
        <p className="text-sm text-ink-soft">{plural(source.attempts, 'attempt')}, so it can't be deleted here</p>
      ) : confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Delete all of it?</span>
          <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Yes, delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setConfirming(true)} aria-label={`Delete ${source.name}`}>
          Delete
        </Button>
      )}
    </li>
  )
}

export function SourceList() {
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: async () => readJson(await api.api.sources.$get()),
  })

  return (
    <section aria-labelledby="sources-heading" className="mt-10">
      <h2 id="sources-heading" className="text-xl">
        Sources in the app
      </h2>
      <p className="mt-1 mb-3 text-sm text-ink-soft">
        Deleting removes a source and all its questions, which is useful for clearing out a trial import.
      </p>
      {sources.isPending && <Spinner />}
      {sources.isError && <ErrorText>{failureMessage(sources.error)}</ErrorText>}
      {sources.data?.length === 0 && <p className="text-sm text-ink-soft">None yet.</p>}
      {sources.data && sources.data.length > 0 && (
        <Card as="ul" padding="none" className="divide-y divide-line">
          {sources.data.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </Card>
      )}
    </section>
  )
}

/** Load a question bank file: check it, see what it would do, then save it. */
