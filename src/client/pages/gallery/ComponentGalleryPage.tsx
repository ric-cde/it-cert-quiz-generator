import { Spinner } from '@/components/Spinner'
import { FeatureOverride } from '@/lib/features'
import { DEFAULT_FEATURES, FEATURE_KEYS } from '@shared/features'
import { Section } from './kit'
import { GALLERY_SECTIONS } from './sections'

// Every feature on, so the gallery always shows components in full, whatever Settings says.
const ALL_ON = Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])) as typeof DEFAULT_FEATURES

/** The theme and every component state, at /dev/components. The sections are listed in `sections.ts`. */
export function ComponentGalleryPage() {
  return (
    <div className="lg:grid lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Gallery sections" className="mb-6 lg:sticky lg:top-6 lg:mb-0 lg:self-start">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm lg:block lg:space-y-1.5">
          {GALLERY_SECTIONS.map(({ id, title }) => (
            <li key={id}>
              <a href={`#${id}`} className="text-ink-soft no-underline hover:text-accent">
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <header className="mb-8">
          <h1 className="text-2xl">Component gallery</h1>
          <p className="mt-1 max-w-2xl text-ink-soft">
            The theme and every component state, using sample content. Spinner in use:{' '}
            <Spinner className="align-[-2px]" />
          </p>
        </header>
        <FeatureOverride flags={ALL_ON}>
          <div className="space-y-10">
            {GALLERY_SECTIONS.map(({ id, title, intro, Component }) => (
              <Section key={id} id={id} title={title} intro={intro}>
                <Component />
              </Section>
            ))}
          </div>
        </FeatureOverride>
      </div>
    </div>
  )
}
