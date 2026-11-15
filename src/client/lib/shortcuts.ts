import { useEffect, useRef } from 'react'

/**
 * Whether a key press is for a screen's own shortcuts. They stay out of the way while typing, and
 * of the browser's own, such as Ctrl+R. Enter on a focused button or link already presses it.
 */
export function isForShortcuts(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return false
  const target = event.target
  if (!(target instanceof HTMLElement)) return true
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
    return false
  if (target instanceof HTMLInputElement) return target.type === 'radio' || target.type === 'checkbox'
  return !(event.key === 'Enter' && (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement))
}

/**
 * Listens for a screen's shortcuts while it's shown. The handler is read fresh on every key press,
 * so it never sees an old selection, and only gets presses meant for shortcuts (see `isForShortcuts`).
 * Call `event.preventDefault()` for the keys it handles.
 */
export function useShortcuts(handler: (event: KeyboardEvent, key: string) => void) {
  const current = useRef(handler)
  current.current = handler
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (isForShortcuts(event)) current.current(event, event.key.toLowerCase())
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}
