/** Beyond this many, a run of squares would be a wall, so it stops adding them. */
export const MAX_SQUARES = 500

/**
 * One entry for each square to draw, grouped in the order given. Past the limit, every so many
 * stands for the rest, so each part keeps its share.
 */
export function squareParts<Part extends string>(counts: readonly (readonly [Part, number])[], max = MAX_SQUARES) {
  const parts = counts.flatMap(([part, count]) => Array<Part>(Math.max(Math.floor(count), 0)).fill(part))
  const shown = Math.min(parts.length, max)
  return Array.from({ length: shown }, (_, index) => parts[Math.floor((index * parts.length) / shown)]!)
}

/** The first step whose `upTo` covers the count, or the last one. Squares shrink in steps as they multiply. */
export function sizeStep<Step extends { upTo: number }>(steps: readonly Step[], count: number): Step {
  return steps.find((step) => count <= step.upTo) ?? steps[steps.length - 1]!
}
