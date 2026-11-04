import clsx from 'clsx'

/** A hand-drawn tick, like a marker's pen. It draws itself in when it appears. */
export function TickMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={clsx('size-6', className)}>
      <path
        pathLength={1}
        d="M3.500 13.200c2.300 1.900 4.200 4 5.800 6.500C12.100 13.300 16 8.100 21 3.900"
        stroke="currentColor"
        strokeWidth={2.800}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mark-stroke animate-draw"
      />
    </svg>
  )
}

/** A hand-drawn cross. */
export function CrossMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={clsx('size-6', className)}>
      <path
        pathLength={1}
        d="M5 4.800c4.800 4.400 9.300 9.100 14 14.600"
        stroke="currentColor"
        strokeWidth={2.800}
        strokeLinecap="round"
        className="mark-stroke animate-draw"
      />
      <path
        pathLength={1}
        d="M19.200 5C14.400 9.500 9.800 14.300 4.900 19.300"
        stroke="currentColor"
        strokeWidth={2.800}
        strokeLinecap="round"
        className="mark-stroke animate-draw [animation-delay:120ms]"
      />
    </svg>
  )
}
