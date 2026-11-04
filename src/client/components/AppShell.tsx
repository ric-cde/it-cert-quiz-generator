import { Link, Outlet } from 'react-router'

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
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
        <div className="mx-auto flex max-w-5xl gap-4 px-4 py-4 text-xs">
          <Link to="/dev/components">Component gallery</Link>
        </div>
      </footer>
    </div>
  )
}
