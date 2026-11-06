/**
 * Every source gets an animal icon, so sources are easy to tell apart at a glance. A source stores
 * only the icon's key, such as `fox`. The artwork lives on the client, in a file written by
 * `npm run icons:build` from the keys listed here.
 *
 * To update the set, edit this list and run `npm run icons:build`. Add a key to offer a new icon.
 * A key that's removed is retired: sources that had it are given a new icon when the server starts.
 * Keep keys stable, even if the artwork changes, because they're what's saved.
 *
 * The order matters. Earlier icons are suggested first, so the most appealing ones lead.
 */
export const SOURCE_ICON_KEYS: readonly string[] = [
  'fox', 'owl', 'octopus', 'penguin', 'panda', 'koala', 'lion', 'flamingo',
  'turtle', 'hedgehog', 'otter', 'giraffe', 'parrot', 'dolphin', 'raccoon', 'tiger',
  'elephant', 'peacock', 'rabbit', 'whale', 'sloth', 'zebra', 'swan', 'crab',
  'butterfly', 'bear', 'wolf', 'monkey', 'duck', 'kangaroo', 'llama', 'hamster',
  'shark', 'jellyfish', 'seal', 'chipmunk', 'camel', 'hippopotamus', 'rhinoceros', 'gorilla',
  'orangutan', 'leopard', 'deer', 'moose', 'bison', 'beaver', 'badger', 'skunk',
  'mammoth', 'unicorn', 'dragon', 't-rex', 'sauropod', 'lizard', 'snake', 'crocodile',
  'frog', 'snail', 'spider', 'scorpion', 'lobster', 'squid', 'tropical-fish', 'blowfish',
  'shrimp', 'honeybee', 'lady-beetle', 'ant', 'cricket', 'bat', 'eagle', 'dove',
  'goose', 'turkey', 'rooster', 'chicken', 'baby-chick', 'dodo', 'blackbird', 'bird',
  'cat', 'dog', 'poodle', 'horse', 'cow', 'pig', 'boar', 'goat',
  'ram', 'ewe', 'donkey', 'ox', 'water-buffalo', 'mouse', 'rat', 'polar-bear',
]

const POOL = new Set(SOURCE_ICON_KEYS)

export const isIconKey = (value: unknown): value is string => typeof value === 'string' && POOL.has(value)

/** "t-rex" becomes "T rex", "polar-bear" becomes "Polar bear". */
export function iconName(key: string) {
  const words = key.replaceAll('-', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The icons a source can have, given the ones other sources hold: those held by the fewest. While
 * some are unused, that's the unused ones. Once every icon is taken, it starts a second round, so
 * the next source can have any icon that's been used once, and so on. Always in pool order.
 */
export function iconChoices(heldByOthers: readonly (string | null)[]): string[] {
  const uses = new Map<string, number>(SOURCE_ICON_KEYS.map((key) => [key, 0]))
  for (const held of heldByOthers) {
    if (isIconKey(held)) uses.set(held, uses.get(held)! + 1)
  }
  const fewest = Math.min(...uses.values())
  return SOURCE_ICON_KEYS.filter((key) => uses.get(key) === fewest)
}

/** The icon suggested for a new source: the first of its choices. */
export const suggestIcon = (heldByOthers: readonly (string | null)[]) => iconChoices(heldByOthers)[0]!
