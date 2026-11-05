/**
 * How far through the quiz you are. It's in the neutral accent colour, because green and red mean
 * marked, and at-the-end feedback mustn't hint at how you're doing.
 */
export function QuizProgress({ position, total }: { position: number; total: number }) {
  const percent = total > 0 ? Math.min(Math.max(position / total, 0), 1) * 100 : 0
  return (
    <div
      role="progressbar"
      aria-label="Quiz progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={position}
      className="h-1.5 overflow-hidden rounded-full bg-sunken"
    >
      <div className="h-full bg-accent transition-[width] duration-300 ease-out-soft" style={{ width: `${percent}%` }} />
    </div>
  )
}
