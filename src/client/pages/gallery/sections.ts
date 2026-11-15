import type { ComponentType } from 'react'
import { Answers } from './sections/Answers'
import { Buttons } from './sections/Buttons'
import { CodeBlocks } from './sections/CodeBlocks'
import { Colours } from './sections/Colours'
import { DataTables } from './sections/DataTables'
import { Fields } from './sections/Fields'
import { FilterControls } from './sections/FilterControls'
import { HomeParts } from './sections/HomeParts'
import { Importing } from './sections/Importing'
import { Keycaps } from './sections/Keycaps'
import { Layout } from './sections/Layout'
import { MarkdownSample } from './sections/MarkdownSample'
import { Messages } from './sections/Messages'
import { ProgressBars } from './sections/ProgressBars'
import { QuizParts } from './sections/QuizParts'
import { ResultsParts } from './sections/ResultsParts'
import { Shape } from './sections/Shape'
import { Tiles } from './sections/Tiles'
import { TryIt } from './sections/TryIt'
import { TypeScale } from './sections/TypeScale'
import { Verdicts } from './sections/Verdicts'

export type GallerySection = { id: string; title: string; intro?: string; Component: ComponentType }

/**
 * Every section of the gallery, in page order. Each lives in its own file in `sections/`. To show a
 * new component, add a specimen to the section it belongs in, or a new file and one line here.
 */
export const GALLERY_SECTIONS: GallerySection[] = [
  {
    id: 'try-it',
    title: 'Try it',
    intro:
      'The parts working together, to judge the feel. Answer or reveal, then move on. The keyboard shortcuts work on the real quiz screen.',
    Component: TryIt,
  },
  {
    id: 'colours',
    title: 'Colours',
    intro: 'Green and red are kept for marking, so they always mean something.',
    Component: Colours,
  },
  {
    id: 'type',
    title: 'Type',
    intro: 'Atkinson Hyperlegible, designed so similar characters are easy to tell apart.',
    Component: TypeScale,
  },
  { id: 'shape', title: 'Spacing and shape', Component: Shape },
  {
    id: 'layout',
    title: 'Cards and sections',
    intro: 'Every card-like block is a Card, so changing the look of cards is one edit.',
    Component: Layout,
  },
  { id: 'buttons', title: 'Buttons', Component: Buttons },
  {
    id: 'keycaps',
    title: 'Keycaps',
    intro: 'Show shortcuts wherever they apply. Settings can hide them, and the keys still work.',
    Component: Keycaps,
  },
  {
    id: 'progress',
    title: 'Progress bars',
    intro:
      'Green: latest attempt correct. Amber: attempted, latest attempt not correct. Empty: never attempted. The figure is % complete. Tiles show either the bar or a square for each question, chosen in Settings.',
    Component: ProgressBars,
  },
  { id: 'tiles', title: 'Tiles', Component: Tiles },
  {
    id: 'answers',
    title: 'Answer options',
    intro:
      'Right and wrong always have a mark and a label as well as colour. A correct answer you missed has a dashed border.',
    Component: Answers,
  },
  {
    id: 'quiz',
    title: 'Taking a quiz',
    intro: "The parts of the quiz screen that aren't shown elsewhere.",
    Component: QuizParts,
  },
  { id: 'home', title: 'Home', intro: "Each exam, with its own progress and each source's.", Component: HomeParts },
  {
    id: 'results',
    title: 'Results',
    intro: 'The end of a quiz: how each category went, and Review answers.',
    Component: ResultsParts,
  },
  { id: 'verdicts', title: 'Verdicts', Component: Verdicts },
  {
    id: 'messages',
    title: 'Loading and errors',
    intro: "A screen loading, a screen that couldn't load, and an error beside what caused it.",
    Component: Messages,
  },
  {
    id: 'code',
    title: 'Code blocks',
    intro:
      'Press the copy icon to see its confirmation. The code icon turns syntax highlighting on and off everywhere, and the choice is saved.',
    Component: CodeBlocks,
  },
  {
    id: 'markdown',
    title: 'Markdown',
    intro: 'All question and option text. Raw HTML is dropped.',
    Component: MarkdownSample,
  },
  { id: 'filters', title: 'Filters', Component: FilterControls },
  { id: 'fields', title: 'Text fields', Component: Fields },
  { id: 'data-tables', title: 'Data tables', intro: 'Used by the data inspector.', Component: DataTables },
  { id: 'importing', title: 'Importing', intro: 'Used by the import screen.', Component: Importing },
]
