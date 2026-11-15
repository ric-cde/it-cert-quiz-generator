import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Spinner } from './Spinner'

/** Something that went wrong, read out as soon as it appears. */
export function ErrorText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={clsx('text-sm font-semibold text-wrong-ink', className)}>
      {children}
    </p>
  )
}

/** A whole screen still loading. */
export function PageLoading({ className }: { className?: string }) {
  return (
    <p className={className}>
      <Spinner />
      <span className="sr-only">Loading…</span>
    </p>
  )
}

/** A whole screen that couldn't load, with the way back home. */
export function PageError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={className}>
      <p className="font-semibold text-wrong-ink">{children}</p>
      <p className="mt-2 text-sm">
        <Link to="/">Back to home</Link>
      </p>
    </div>
  )
}
