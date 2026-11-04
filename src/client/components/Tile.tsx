import clsx from 'clsx'
import { Check, ChevronDown, Dices } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProgressBar, type ProgressCounts } from './ProgressBar'

function SelectedBadge() {
  return (
    <span className="absolute -top-1.5 -right-1.5 flex size-5 animate-pop items-center justify-center rounded-full bg-accent text-on-accent shadow-raised">
      <Check className="size-3" strokeWidth={4} aria-hidden="true" />
    </span>
  )
}

function tileClass({ selected, diminished, empty }: { selected: boolean; diminished: boolean; empty: boolean }) {
  return clsx(
    'relative block w-full rounded-md border-[1.5px] text-left transition-[border-color,background-color,box-shadow] duration-100',
    'focus-ring:outline-2 focus-ring:outline-offset-2 focus-ring:outline-accent',
    empty
      ? 'cursor-not-allowed border-line border-dashed bg-transparent'
      : selected
        ? 'cursor-pointer border-accent bg-accent-soft'
        : clsx(
            'cursor-pointer bg-surface shadow-card hocus:border-accent hocus:shadow-raised',
            diminished ? 'border-line' : 'border-line-strong/60',
          ),
  )
}

export type TileProps = {
  title: string
  /** How many questions this tile covers. */
  count: number
  progress: ProgressCounts
  selected?: boolean
  /** Greyed while Random is selected. Still clickable: clicking turns Random off. */
  diminished?: boolean
  onClick?: () => void
  'data-force'?: string
}

function TileBody({ title, count, progress, diminished, empty }: TileProps & { empty: boolean }) {
  return (
    <>
      <span className={clsx('block font-semibold leading-snug', (diminished || empty) && 'text-ink-soft')}>{title}</span>
      <span className="mt-0.5 mb-2 block text-xs text-ink-soft">
        {count} {count === 1 ? 'question' : 'questions'}
      </span>
      <ProgressBar {...progress} label={`${title} progress`} muted={diminished} />
    </>
  )
}

/** A category or chapter. A tile with no questions can't be selected. */
export function Tile(props: TileProps) {
  const { selected = false, diminished = false, count, onClick, 'data-force': force } = props
  const empty = count === 0
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={empty}
      onClick={onClick}
      data-force={force}
      className={clsx(tileClass({ selected, diminished, empty }), 'p-3')}
    >
      {selected && <SelectedBadge />}
      <TileBody {...props} empty={empty} />
    </button>
  )
}

/** A source: a tile that also expands to show its chapters. */
export function SourceTile({
  expanded,
  onToggleExpanded,
  chapterCount,
  children,
  ...tile
}: TileProps & {
  expanded: boolean
  onToggleExpanded?: () => void
  chapterCount: number
  /** The chapter tiles, shown while expanded. */
  children?: ReactNode
}) {
  const { selected = false, diminished = false, count, onClick, 'data-force': force } = tile
  const empty = count === 0

  return (
    <div className={clsx(expanded && 'col-span-full')}>
      <div className="relative">
        <button
          type="button"
          aria-pressed={selected}
          disabled={empty}
          onClick={onClick}
          data-force={force}
          className={clsx(tileClass({ selected, diminished, empty }), 'p-3 pb-10')}
        >
          {selected && <SelectedBadge />}
          <TileBody {...tile} empty={empty} />
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold text-accent hover:bg-accent-soft"
        >
          <ChevronDown
            className={clsx('size-3.5 transition-transform duration-150', expanded && 'rotate-180')}
            strokeWidth={3}
            aria-hidden="true"
          />
          {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
          <span className="sr-only"> in {tile.title}</span>
        </button>
      </div>
      {expanded && (
        <div className="mt-2 grid animate-rise grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2 rounded-md bg-sunken p-2.5">
          {children}
        </div>
      )}
    </div>
  )
}

/** The Random tile: one row at the top, drawing from the whole exam. */
export function RandomTile({
  selected = false,
  onClick,
  'data-force': force,
}: {
  selected?: boolean
  onClick?: () => void
  'data-force'?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-force={force}
      className={clsx(
        tileClass({ selected, diminished: false, empty: false }),
        'flex items-center gap-3 p-3',
      )}
    >
      {selected && <SelectedBadge />}
      <Dices className={clsx('size-6 flex-none', selected ? 'text-accent' : 'text-ink-soft')} aria-hidden="true" />
      <span>
        <span className="block font-semibold leading-snug">Random</span>
        <span className="block text-xs text-ink-soft">Draws from the whole exam</span>
      </span>
    </button>
  )
}

/** Lays out tiles in a responsive grid. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2.5">{children}</div>
}
