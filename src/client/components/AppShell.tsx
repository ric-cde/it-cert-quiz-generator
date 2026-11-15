import { Link, Outlet, useMatch } from 'react-router'
import { useMe } from '@/lib/me'

export function AppShell() {
  const { isAdmin } = useMe()
  // Only where you choose what to do, so they stay out of the way during a quiz.
  const onHome = useMatch('/') !== null
  const onTakeExam = useMatch('/exam/:id') !== null

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
          {isAdmin && (onHome || onTakeExam) && (
            <>
              <Link to="/dev/data">Data inspector</Link>
              <Link to="/dev/components">Component gallery</Link>
              <Link to="/dev/questions">Question viewer</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
