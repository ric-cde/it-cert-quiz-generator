import { asc, eq, ne } from 'drizzle-orm'
import { iconChoices, isIconKey, SOURCE_ICON_KEYS, suggestIcon } from '../shared/source-icons'
import type { Db, Tx } from './db'
import { sources } from './db/schema'

type Reader = Db | Tx

/**
 * The icons a source can have, and the one it has or would get. Sources are compared across every
 * exam, so an icon means one source wherever it's shown. `sourceId` leaves out a source's own icon,
 * so it can keep it or swap it. A source with no icon, or a retired one, is suggested the first choice.
 */
export function iconOptions(db: Reader, sourceId?: number) {
  const others = db
    .select({ icon: sources.icon })
    .from(sources)
    .where(sourceId === undefined ? undefined : ne(sources.id, sourceId))
    .all()
    .map((row) => row.icon)
  const current = sourceId === undefined ? null : db.select({ icon: sources.icon }).from(sources).where(eq(sources.id, sourceId)).get()?.icon
  const icon = isIconKey(current) ? current : suggestIcon(others)
  // Its own icon is always one of the choices, even in a later round when others hold it too.
  const choices = new Set([...iconChoices(others), icon])
  return { icon, choices: SOURCE_ICON_KEYS.filter((key) => choices.has(key)) }
}

/**
 * Gives every source without a usable icon one, oldest first. Run when the database opens, so
 * sources from before icons existed, and ones whose icon has since been retired, are covered.
 */
export function assignMissingIcons(db: Reader) {
  const rows = db.select({ id: sources.id, icon: sources.icon }).from(sources).orderBy(asc(sources.id)).all()
  const held = rows.map((row) => row.icon).filter(isIconKey)
  for (const row of rows) {
    if (isIconKey(row.icon)) continue
    const icon = suggestIcon(held)
    held.push(icon)
    db.update(sources).set({ icon }).where(eq(sources.id, row.id)).run()
  }
}
