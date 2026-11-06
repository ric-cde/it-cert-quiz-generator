/**
 * Whether a key press is for a screen's own shortcuts. They stay out of the way while typing, and
 * of the browser's own, such as Ctrl+R. Enter on a focused button or link already presses it.
 */
export function isForShortcuts(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return false
  const target = event.target
  if (!(target instanceof HTMLElement)) return true
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return false
  if (target instanceof HTMLInputElement) return target.type === 'radio' || target.type === 'checkbox'
  return !(event.key === 'Enter' && (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement))
}
