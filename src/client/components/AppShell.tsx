import { useQuery } from '@tanstack/react-query'
import { Link, Outlet } from 'react-router'
import { api } from '@/lib/api'
import { readJson } from '@/lib/http'

export function AppShell() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => readJson(await api.api.me.$get()),
  })

  return (
    // A size container, so a page can stretch something to the full width of the window with `cqw`,
    // which unlike `vw` leaves out the scrollbar.
    <div className="@container flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-ink hover:text-ink">
            <img src="/favicon.svg" alt="" className="size-6" />
            Cert Quiz
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex min-h-13 max-w-5xl gap-4 px-4 py-4 text-xs">
          {me.data?.role === 'admin' && (
            <>
              <Link to="/dev/data">Data inspector</Link>
              <Link to="/dev/components">Component gallery</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
