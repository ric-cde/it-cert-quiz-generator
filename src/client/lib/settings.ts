import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OptionOrder } from '@shared/domain'
import type { FeatureChanges } from '@shared/features'
import { api } from './api'
import { readJson } from './http'

const QUERY_KEY = ['settings']

/** The saved settings, shared by every screen that reads them. */
export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => readJson(await api.api.settings.$get()),
  })
}

type Settings = NonNullable<ReturnType<typeof useSettings>['data']>
export type SettingsChanges = { syntaxHighlighting?: boolean; optionOrder?: OptionOrder; features?: FeatureChanges }

/** Saves a change to the settings. It shows straight away, and goes back if the save fails. */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: SettingsChanges) => readJson(await api.api.settings.$patch({ json: changes })),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<Settings>(QUERY_KEY)
      if (previous) {
        queryClient.setQueryData<Settings>(QUERY_KEY, {
          ...previous,
          ...(changes.syntaxHighlighting === undefined ? {} : { syntaxHighlighting: changes.syntaxHighlighting }),
          ...(changes.optionOrder === undefined ? {} : { optionOrder: changes.optionOrder }),
          features: { ...previous.features, ...changes.features },
        })
      }
      return { previous }
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    },
  })
}

/**
 * The global syntax highlighting setting, shared by every code block. Code stays plain until
 * the setting has loaded, so someone practising without highlighting never gets a flash of it.
 */
export function useSyntaxHighlighting() {
  const settings = useSettings()
  const save = useUpdateSettings()
  const enabled = settings.data?.syntaxHighlighting === true
  return { enabled, ready: settings.isSuccess, toggle: () => save.mutate({ syntaxHighlighting: !enabled }) }
}
