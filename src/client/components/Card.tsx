import clsx from 'clsx'
import { createElement, type HTMLAttributes } from 'react'

/**
 * The app's one card style: a bordered panel on the paper background. Every card-like block uses
 * this, so changing the look of cards is one edit here.
 */

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'
export type CardElevation = 'flat' | 'card' | 'raised'
export type CardTone = 'surface' | 'sunken'

export type CardStyle = {
  /** `none` for lists and tables that pad their own rows. `lg` for a screen's main card. */
  padding?: CardPadding
  elevation?: CardElevation
  /** `sunken` marks a card that's set apart, such as a revealed question. */
  tone?: CardTone
}

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

const ELEVATION: Record<CardElevation, string> = {
  flat: '',
  card: 'shadow-card',
  raised: 'shadow-raised',
}

const TONE: Record<CardTone, string> = {
  surface: 'border-line bg-surface',
  sunken: 'border-line-strong/60 bg-sunken',
}

/** The card's classes, for an element that can't be a `Card`, such as one that needs its own hover. */
export function cardClass({ padding = 'md', elevation = 'card', tone = 'surface' }: CardStyle = {}) {
  return clsx('rounded-lg border', TONE[tone], ELEVATION[elevation], PADDING[padding])
}

type CardElement = 'div' | 'section' | 'article' | 'ul' | 'p'

export function Card({
  as = 'div',
  padding,
  elevation,
  tone,
  className,
  ...rest
}: CardStyle & HTMLAttributes<HTMLElement> & { as?: CardElement; 'data-revealed'?: boolean }) {
  return createElement(as, { className: clsx(cardClass({ padding, elevation, tone }), className), ...rest })
}
