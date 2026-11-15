import { useSyncExternalStore } from 'react'
import { readCodeWrap, saveCodeWrap } from './remembered'

/** Phone width, as Tailwind's `sm` breakpoint: below it, code wraps until you choose otherwise. */
export const PHONE_QUERY = '(max-width: 39.999rem)'

const listeners = new Set<() => void>()

function onPhone() {
  return typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
}

/** Wraps on a phone and scrolls sideways elsewhere, until you press the button in a code block. */
export function wrapsCode() {
  return readCodeWrap() ?? onPhone()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Turning a phone on its side can cross the breakpoint.
  const media = typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null
  media?.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    media?.removeEventListener('change', listener)
  }
}

/** Whether code blocks wrap long lines. Every block on the screen changes together. */
export function useCodeWrap() {
  const wrap = useSyncExternalStore(subscribe, wrapsCode)
  return {
    wrap,
    toggle: () => {
      saveCodeWrap(!wrap)
      for (const listener of listeners) listener()
    },
  }
}
