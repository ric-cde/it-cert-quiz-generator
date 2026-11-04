import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { buttonClass } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { api } from '@/lib/api'

/** A temporary home page, until Stage 6: confirms the frontend can reach the server and database. */
export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await api.api.health.$get()
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      return res.json()
    },
  })

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl">Cert Quiz</h1>
      <p className="mt-1 text-ink-soft">The foundation is running. Screens arrive in later stages.</p>

      <section aria-label="Server status" className="mt-6 rounded-lg border border-line bg-surface p-4 shadow-card">
        <h2 className="text-base">Server check</h2>
        {health.isPending && (
          <p className="mt-2 flex items-center gap-2 text-ink-soft">
            <Spinner /> Contacting the server…
          </p>
        )}
        {health.isError && (
          <p role="alert" className="mt-2 text-sm font-semibold text-wrong-ink">
            Couldn't reach the server: {health.error.message}
          </p>
        )}
        {health.isSuccess && (
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-semibold text-correct-ink">Connected.</span> Loaded from the database:{' '}
            {health.data.users.map((user) => `${user.name} (${user.role})`).join(', ')}
          </p>
        )}
      </section>

      <Link to="/dev/components" className={`${buttonClass({ variant: 'primary' })} mt-6 hover:text-on-accent`}>
        Open the component gallery
      </Link>
    </div>
  )
}
