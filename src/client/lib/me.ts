import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { readJson } from './http'

/** Who's using the app, and what they may do. The UI hides controls you can't use; the server checks again. */
export function useMe() {
  const me = useQuery({ queryKey: ['me'], queryFn: async () => readJson(await api.api.me.$get()) })
  const role = me.data?.role
  return { me: me.data, isAdmin: role === 'admin', canEdit: role === 'admin' || role === 'editor' }
}
