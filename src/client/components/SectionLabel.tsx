import type { ReactNode } from 'react'

/** A small capitalised label above a group, such as a subject's exams on the home page. */
export function SectionLabel({ as: Tag = 'h2', id, children }: { as?: 'h2' | 'h3'; id?: string; children: ReactNode }) {
  return (
    <Tag id={id} className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">
      {children}
    </Tag>
  )
}
