import { type ReactNode } from 'react'

/** The building blocks of a gallery section. */

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-xl">{title}</h2>
      {intro && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{intro}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  )
}
/** One labelled state of a component. */
export function Specimen({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <p className="mb-2 text-xs font-semibold text-ink-soft">{label}</p>
      {children}
    </div>
  )
}
export function SpecimenGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-5 gap-y-6">{children}</div>
}
