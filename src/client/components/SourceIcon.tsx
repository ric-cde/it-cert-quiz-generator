import clsx from 'clsx'
import { PawPrint } from 'lucide-react'
import { Popover } from 'radix-ui'
import { iconName } from '../../shared/source-icons'
import { SOURCE_ICON_ART } from '../icons/source-icon-art.generated'

const urls = new Map<string, string>()

/**
 * The artwork as an image, not inline SVG: the pictures use gradients with their own ids, which
 * would clash if the same icon were on the page twice.
 */
function artUrl(key: string) {
  const art = SOURCE_ICON_ART[key]
  if (!art) return undefined
  if (!urls.has(key)) urls.set(key, `data:image/svg+xml,${encodeURIComponent(art)}`)
  return urls.get(key)
}

/**
 * A source's animal. Decorative: the source's name is always beside it. A source with no icon yet, or
 * one the set has since dropped, shows a paw print.
 */
export function SourceIcon({ icon, className = 'size-5', muted = false }: { icon: string | null; className?: string; muted?: boolean }) {
  const url = icon ? artUrl(icon) : undefined
  if (!url) return <PawPrint className={clsx(className, 'flex-none text-ink-soft')} aria-hidden="true" />
  return <img src={url} alt="" draggable={false} className={clsx(className, 'flex-none select-none', muted && 'opacity-50 grayscale')} />
}

/**
 * Shows a source's icon on a button that opens the icons it could have instead. The choices are
 * the ones fewest sources hold, so they're picked from the unused ones while any are left.
 */
export function SourceIconPicker({
  icon,
  choices,
  onChange,
  disabled,
}: {
  icon: string
  choices: readonly string[]
  onChange: (icon: string) => void
  disabled?: boolean
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        disabled={disabled}
        title="Choose a different icon"
        aria-label={`Source icon: ${iconName(icon)}. Choose a different one`}
        className="flex-none cursor-pointer rounded-lg border border-line-strong/60 bg-surface p-1.5 shadow-card hover:border-accent hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SourceIcon icon={icon} className="size-10" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          aria-label="Source icons"
          className="z-30 w-[min(22rem,calc(100vw-2rem))] animate-rise rounded-md border border-line bg-surface p-2 shadow-raised"
        >
          <p className="mb-2 px-1 text-xs text-ink-soft">
            {choices.length === 1 ? 'No other icon is free.' : 'Icons no other source has.'} Choose one.
          </p>
          <div className="grid max-h-72 grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 overflow-y-auto">
            {choices.map((key) => (
              <Popover.Close
                key={key}
                aria-label={iconName(key)}
                aria-pressed={key === icon}
                title={iconName(key)}
                onClick={() => onChange(key)}
                className={clsx(
                  'flex cursor-pointer items-center justify-center rounded-md border-[1.5px] p-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                  key === icon ? 'border-accent bg-accent-soft' : 'border-transparent hover:border-accent hover:bg-accent-soft',
                )}
              >
                <SourceIcon icon={key} className="size-8" />
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
