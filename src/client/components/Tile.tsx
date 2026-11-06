import clsx from 'clsx'
import { BadgeCheck, BadgeMinus, Check, ChevronDown, Dices } from 'lucide-react'
import type { ReactNode } from 'react'
import { Kbd } from './Kbd'
import { ProgressBar, type ProgressCounts, type ProgressEmphasis } from './ProgressBar'

/** A filled square checkbox, so it can't be mistaken for the round official badge. */
function SelectedBadge() {
  return (
    <span className="absolute -top-1.5 -right-1.5 flex size-5 animate-pop items-center justify-center rounded-[5px] bg-accent text-on-accent shadow-raised">
      <Check className="size-3" strokeWidth={4} aria-hidden="true" />
    </span>
  )
}

function tileClass({
  selected,
  diminished,
  empty,
  included = false,
}: {
  selected: boolean
  diminished: boolean
  empty: boolean
  /** Some of its questions are in the quiz, though it isn't selected itself. */
  included?: boolean
}) {
  return clsx(
    'relative block w-full rounded-md border-[1.5px] text-left transition-[border-color,background-color,box-shadow,opacity,filter] duration-150',
    'focus-ring:outline-2 focus-ring:outline-offset-2 focus-ring:outline-accent',
    empty
      ? 'cursor-not-allowed border-line border-dashed bg-transparent'
      : selected
        ? // A thicker border than any other tile. The inner ring adds to it without moving the content.
          'cursor-pointer border-accent bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-accent)]'
        : // While Random is on, tiles go flat, with grey badges and faded bars. The text stays readable.
          // Those Random draws from have a dotted accent border.
          diminished
          ? clsx(
              'cursor-pointer bg-transparent hocus:border-solid hocus:border-accent hocus:bg-surface hocus:shadow-raised',
              included ? 'border-dotted border-accent' : 'border-line',
            )
          : clsx(
              'cursor-pointer border-line-strong/60 shadow-card hocus:border-accent hocus:shadow-raised',
              included ? 'bg-accent-soft' : 'bg-surface',
            ),
  )
}

export type TileProps = {
  title: string
  /** How many questions this tile would add now. At 0 it's greyed, but can still be picked. */
  count: number
  /** Nothing in it could ever be asked, so it can't be picked unless it already is. */
  empty?: boolean
  progress: ProgressCounts
  selected?: boolean
  /** Greyed while Random is selected. Still clickable: clicking turns Random off. */
  diminished?: boolean
  /** The status filter: the part of the bar it picks stands out. */
  emphasis?: ProgressEmphasis
  /**
   * Some of its questions are in the quiz because of other picks, such as a category's when a
   * source is selected. Shown with a soft blue background. Under Random, it's every tile with
   * questions, shown with a dotted border instead.
   */
  included?: boolean
  /** For categories: from the exam's own syllabus, or added by an imported file. */
  origin?: 'official' | 'unofficial'
  onClick?: () => void
  'data-force'?: string
}

/** A small badge in the tile's corner. Hovering it says what it means, and screen readers hear it. */
function OriginBadge({ origin, muted }: { origin: 'official' | 'unofficial'; muted: boolean }) {
  const official = origin === 'official'
  const Icon = official ? BadgeCheck : BadgeMinus
  return (
    <span title={official ? 'Official' : 'Unofficial'} className="absolute top-2.5 right-2.5">
      <Icon className={clsx('size-4', official && !muted ? 'text-accent' : 'text-line-strong')} aria-hidden="true" />
      <span className="sr-only">{official ? ', official' : ', unofficial'}</span>
    </span>
  )
}

function TileBody({ title, count, progress, diminished, origin, empty, emphasis }: TileProps) {
  return (
    <>
      {/* The spaces keep the title, count and figure apart when read aloud, as they look on screen. */}
      <span className={clsx('block font-semibold leading-snug', (diminished || count === 0) && 'text-ink-soft', origin && 'pr-6')}>
        {title}
      </span>
      {/* After the title in reading order, though it sits in the corner. */}
      {origin && <OriginBadge origin={origin} muted={Boolean(diminished)} />}{' '}
      <span className="mt-0.5 mb-2 block text-xs text-ink-soft">
        {count} {count === 1 ? 'question' : 'questions'}
      </span>{' '}
      <ProgressBar {...progress} label={`${title} progress`} muted={diminished || empty} emphasis={emphasis} />
    </>
  )
}

function isIncluded({ diminished, included, count }: TileProps) {
  return count > 0 && (Boolean(diminished) || Boolean(included))
}

/** A category or chapter. A tile with no questions can't be selected, but a selected one can still be let go. */
export function Tile(props: TileProps) {
  const { selected = false, diminished = false, empty: never = false, onClick, 'data-force': force } = props
  const empty = never
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={empty && !selected}
      onClick={onClick}
      data-force={force}
      className={clsx(tileClass({ selected, diminished, empty: empty && !selected, included: isIncluded(props) }), 'p-3')}
    >
      {selected && <SelectedBadge />}
      <TileBody {...props} />
    </button>
  )
}

/** A source: a tile that also expands to show its chapters. */
export function SourceTile({
  expanded,
  onToggleExpanded,
  chapterCount,
  children,
  chapterHint,
  ...tile
}: TileProps & {
  expanded: boolean
  onToggleExpanded?: () => void
  chapterCount: number
  /** The chapter tiles, shown while expanded. */
  children?: ReactNode
  /** A line above the chapter tiles. */
  chapterHint?: ReactNode
}) {
  const { selected = false, diminished = false, empty: never = false, onClick, 'data-force': force } = tile
  const empty = never

  return (
    <div className={clsx(expanded && 'col-span-full')}>
      <div className="relative">
        <button
          type="button"
          aria-pressed={selected}
          disabled={empty && !selected}
          onClick={onClick}
          data-force={force}
          className={clsx(
            tileClass({ selected, diminished, empty: empty && !selected, included: isIncluded(tile) }),
            'p-3 pb-10',
          )}
        >
          {selected && <SelectedBadge />}
          <TileBody {...tile} />
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'} in ${tile.title}`}
          onClick={onToggleExpanded}
          className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold text-accent hover:bg-accent-soft"
        >
          <ChevronDown
            className={clsx('size-3.5 transition-transform duration-150', expanded && 'rotate-180')}
            strokeWidth={3}
            aria-hidden="true"
          />
          {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 animate-rise rounded-md bg-sunken p-2.5">
          {chapterHint && <p className="mb-2 text-xs text-ink-soft">{chapterHint}</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2 lg:grid-cols-2">{children}</div>
        </div>
      )}
    </div>
  )
}

/** The Random tile: one row at the top, drawing from the whole exam. */
export function RandomTile({
  selected = false,
  onClick,
  shortcut,
  'data-force': force,
}: {
  selected?: boolean
  /** The key that selects it, shown as a keycap. */
  shortcut?: string
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
      <span className="flex-1">
        <span className="block font-semibold leading-snug">Random</span>
        <span className="block text-xs text-ink-soft">Draws from the whole exam</span>
      </span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  )
}

/**
 * Lays out tiles in a responsive grid. `single-wide` puts one tile per row on wide screens, for
 * sources in their own column.
 */
export function TileGrid({ children, columns = 'auto' }: { children: ReactNode; columns?: 'auto' | 'single-wide' }) {
  return (
    <div
      className={clsx(
        'grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2.5',
        columns === 'single-wide' && 'lg:grid-cols-1',
      )}
    >
      {children}
    </div>
  )
}
