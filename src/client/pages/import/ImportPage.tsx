import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { IssueList } from '@/components/BankPreview'
import { FileDrop } from '@/components/FileDrop'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'
import { parseBankFile } from '@/lib/bank-file'
import { readJson } from '@/lib/http'
import type { ImportOptions } from '@shared/import'
import { ErrorText } from '@/components/Notices'
import { failureMessage } from './messages'
import { PlanView } from './PlanView'
import { ResultView } from './ResultView'
import { SourceList } from './SourceList'

export function ImportPage() {
  const queryClient = useQueryClient()
  const [bank, setBank] = useState<unknown>()
  const [fileError, setFileError] = useState<string>()

  const preview = useMutation({
    mutationFn: async (raw: unknown) => readJson(await api.api.import.preview.$post({ json: { bank: raw } })),
  })
  const commit = useMutation({
    mutationFn: async (options: ImportOptions) =>
      readJson(await api.api.import.commit.$post({ json: { bank, ...options } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  })

  function reset() {
    setBank(undefined)
    setFileError(undefined)
    preview.reset()
    commit.reset()
  }

  async function chooseFile(file: File) {
    reset()
    const parsed = parseBankFile(await file.text())
    if (!parsed.ok) {
      setFileError(`${file.name}: ${parsed.message}`)
      return
    }
    setBank(parsed.bank)
    preview.mutate(parsed.bank)
  }

  const plan = preview.data?.ok ? preview.data : undefined
  const rejected = preview.data && !preview.data.ok ? preview.data : undefined

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">Import questions</h1>
      <p className="mt-1 text-ink-soft">
        Load a question bank file, made with the skill in the Claude app. You'll see a preview, and nothing is saved
        until you press Import.
      </p>

      {commit.data?.ok ? (
        <ResultView result={commit.data} onAnother={reset} />
      ) : (
        <>
          {!plan && (
            <div className="mt-6">
              <FileDrop
                label="Choose a question bank file"
                hint="Or drop a .json file here"
                accept=".json,application/json"
                error={fileError}
                disabled={preview.isPending}
                onFile={chooseFile}
              />
            </div>
          )}

          {preview.isPending && (
            <p className="mt-4 flex items-center gap-2 text-ink-soft">
              <Spinner /> Checking the file…
            </p>
          )}
          {preview.isError && <ErrorText className="mt-4">{failureMessage(preview.error)}</ErrorText>}

          {rejected && (
            <section aria-label="Problems" className="mt-6">
              <h2 className="text-xl">This file can't be imported yet</h2>
              <p className="mt-1 mb-3 text-sm text-ink-soft">
                Nothing was saved. Fix{' '}
                {rejected.problems.length === 1 ? 'this' : `these ${rejected.problems.length} problems`} and choose the
                file again.
              </p>
              <IssueList issues={rejected.problems} tone="wrong" />
            </section>
          )}

          {plan && (
            <PlanView
              plan={plan}
              saving={commit.isPending}
              onImport={(options) => commit.mutate(options)}
              onCancel={reset}
            />
          )}
          {commit.isError && <ErrorText className="mt-4">{failureMessage(commit.error)}</ErrorText>}
        </>
      )}

      <SourceList />
    </div>
  )
}
