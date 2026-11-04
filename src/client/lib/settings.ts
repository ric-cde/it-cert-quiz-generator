import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { readJson } from './http'

const QUERY_KEY = ['settings']

/**
 * The global syntax highlighting setting, shared by every code block. Code stays plain until
 * the setting has loaded, so someone practising without highlighting never gets a flash of it.
 */
export function useSyntaxHighlighting() {
  const queryClient = useQueryClient()

  const settings = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => readJson(await api.api.settings.$get()),
  })

  const save = useMutation({
    mutationFn: async (syntaxHighlighting: boolean) =>
      readJson(await api.api.settings.$patch({ json: { syntaxHighlighting } })),
    // Change straight away, and put it back if the save fails.
    onMutate: async (syntaxHighlighting) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<typeof settings.data>(QUERY_KEY)
      if (previous) queryClient.setQueryData(QUERY_KEY, { ...previous, syntaxHighlighting })
      return { previous }
    },
    onError: (_error, _value, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    },
  })

  const enabled = settings.data?.syntaxHighlighting === true
  return { enabled, ready: settings.isSuccess, toggle: () => save.mutate(!enabled) }
}
