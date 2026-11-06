import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { SOURCE_ICON_KEYS } from '../shared/source-icons'
import { createApi } from './app'
import { commitImport, listSources, previewImport } from './bank-import'
import { type Db, openDb } from './db'
import { exams, sources } from './db/schema'
import { homeOverview } from './home'
import { practiceData } from './selection'
import { assignMissingIcons, iconOptions } from './source-icons'

const EXAM = 'OutSystems Associate Developer (O11)'
const pool = SOURCE_ICON_KEYS

const bank = (name: string) => ({
  formatVersion: 1,
  exam: EXAM,
  source: { name, origin: 'upload' },
  chapters: [
    {
      name: 'One',
      questions: [
        {
          externalId: 'q1',
          type: 'single',
          category: 'Logic',
          bodyMd: `A question for ${name}?`,
          options: [
            { bodyMd: 'Right', isCorrect: true },
            { bodyMd: 'Wrong', isCorrect: false },
          ],
        },
      ],
    },
  ],
})

describe('source icons', () => {
  let db: Db
  beforeEach(() => {
    db = openDb(':memory:')
  })

  const examId = () => db.select().from(exams).where(eq(exams.name, EXAM)).get()!.id
  const iconOf = (name: string) => db.select().from(sources).where(eq(sources.name, name)).get()!.icon
  const importSource = (name: string, icon?: string) => {
    const result = commitImport(db, bank(name), icon ? { icon } : {})
    if (!result.ok) throw new Error(JSON.stringify(result.problems))
  }
  const plan = (name: string) => {
    const preview = previewImport(db, bank(name))
    if (!preview.ok) throw new Error(JSON.stringify(preview.problems))
    return preview.source
  }
  /** Sources made directly, to fill the pool without a hundred imports. */
  const addSources = (icons: readonly (string | null)[]) =>
    icons.forEach((icon, index) => db.insert(sources).values({ examId: examId(), name: `Filler ${index}`, origin: 'upload', icon }).run())

  describe('suggesting one at import', () => {
    it('suggests the first icon for the first source, and offers the whole pool', () => {
      expect(plan('Alpha')).toMatchObject({ icon: pool[0], iconChoices: pool, exists: false })
    })

    it('saves the suggested icon with a new source', () => {
      importSource('Alpha')
      expect(iconOf('Alpha')).toBe(pool[0])
    })

    it('gives each new source an icon no other source has', () => {
      importSource('Alpha')
      importSource('Beta')
      importSource('Gamma')
      expect([iconOf('Alpha'), iconOf('Beta'), iconOf('Gamma')]).toEqual(pool.slice(0, 3))
      expect(plan('Delta')).toMatchObject({ icon: pool[3], iconChoices: pool.slice(3) })
    })

    it('counts sources in every exam, so an icon means one source', () => {
      const other = db.select().from(exams).all().find((exam) => exam.name !== EXAM)!
      db.insert(sources).values({ examId: other.id, name: 'Elsewhere', origin: 'upload', icon: pool[0] }).run()
      expect(plan('Alpha').icon).toBe(pool[1])
    })

    it('saves the icon the user chose instead, from the ones offered', () => {
      importSource('Alpha')
      const choices = plan('Beta').iconChoices
      expect(choices).not.toContain(iconOf('Alpha'))

      importSource('Beta', choices.at(-1))
      expect(iconOf('Beta')).toBe(pool.at(-1))
      // Skipping past the first icon leaves it free for the next source.
      expect(plan('Gamma').icon).toBe(pool[1])
    })

    it('previews without saving anything', () => {
      plan('Alpha')
      expect(db.select().from(sources).all()).toEqual([])
    })
  })

  describe('a source that already exists', () => {
    beforeEach(() => importSource('Alpha'))

    it('keeps its icon when imported into again', () => {
      importSource('Beta')
      expect(plan('Alpha')).toMatchObject({ icon: pool[0], exists: true })
      commitImport(db, bank('Alpha'))
      expect(iconOf('Alpha')).toBe(pool[0])
    })

    it('offers its own icon as well as the free ones, but not another source\'s', () => {
      importSource('Beta')
      const { iconChoices } = plan('Alpha')
      expect(iconChoices).toContain(pool[0])
      expect(iconChoices).not.toContain(pool[1])
      expect(iconChoices).toEqual([pool[0], ...pool.slice(2)])
    })

    it('can have its icon changed when it is imported into', () => {
      importSource('Alpha', 'dodo')
      expect(iconOf('Alpha')).toBe('dodo')
      expect(listSources(db)[0]!.icon).toBe('dodo')
    })
  })

  describe('when every icon has been used', () => {
    it('wraps around: the next source takes the first icon again, then the second', () => {
      addSources(pool)
      expect(plan('Alpha')).toMatchObject({ icon: pool[0], iconChoices: pool })

      importSource('Alpha')
      importSource('Beta')
      expect(iconOf('Alpha')).toBe(pool[0])
      expect(iconOf('Beta')).toBe(pool[1])
      // The first round isn't re-offered until the second one has used everything.
      expect(plan('Gamma').iconChoices).toEqual(pool.slice(2))
    })

    it('still offers a source its own icon when others share it', () => {
      addSources(pool)
      importSource('Alpha')
      expect(plan('Alpha').iconChoices).toContain(pool[0])
    })
  })

  describe('sources from before icons, and icons that were retired', () => {
    it('gives every source without an icon its own, oldest first, when the database opens', () => {
      addSources([null, null, null])
      assignMissingIcons(db)
      expect(db.select().from(sources).all().map((source) => source.icon)).toEqual(pool.slice(0, 3))
    })

    it('leaves a source with a good icon alone, and fills in around it', () => {
      addSources([pool[1]!, null, null])
      assignMissingIcons(db)
      expect(db.select().from(sources).all().map((source) => source.icon)).toEqual([pool[1], pool[0], pool[2]])
    })

    it('replaces an icon that has been dropped from the pool', () => {
      addSources(['retired-animal', pool[0]!])
      assignMissingIcons(db)
      expect(db.select().from(sources).all().map((source) => source.icon)).toEqual([pool[1], pool[0]])
    })

    it('does nothing the second time', () => {
      addSources([null, null])
      assignMissingIcons(db)
      const before = db.select().from(sources).all()
      assignMissingIcons(db)
      expect(db.select().from(sources).all()).toEqual(before)
    })

    it('suggests a new icon for an existing source whose own was retired', () => {
      addSources(['retired-animal'])
      const id = db.select().from(sources).get()!.id
      expect(iconOptions(db, id).icon).toBe(pool[0])
    })
  })

  describe('shown elsewhere', () => {
    it('is in the sources list, the home page and the take-exam data', () => {
      importSource('Alpha')
      importSource('Beta')
      expect(listSources(db).map((source) => source.icon)).toEqual([pool[0], pool[1]])

      const home = homeOverview(db, 1)
      expect(home.subjects.flatMap((subject) => subject.exams).flatMap((exam) => exam.sources).map((source) => source.icon)).toEqual([
        pool[0],
        pool[1],
      ])
      expect(practiceData(db, 1, examId())!.sources.map((source) => source.icon)).toEqual([pool[0], pool[1]])
    })
  })

  describe('through the API', () => {
    const post = (body: unknown) =>
      createApi(db).request('/api/import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    it('accepts a chosen icon and previews with the choices', async () => {
      expect((await post({ bank: bank('Alpha'), icon: 'panda' })).status).toBe(200)
      expect(iconOf('Alpha')).toBe('panda')

      const preview = await createApi(db).request('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank: bank('Beta') }),
      })
      const body = (await preview.json()) as { source: { icon: string; iconChoices: string[] } }
      expect(body.source.icon).toBe(pool[0])
      expect(body.source.iconChoices).not.toContain('panda')
    })

    it('refuses an icon that is not in the pool', async () => {
      expect((await post({ bank: bank('Alpha'), icon: 'not-an-animal' })).status).toBe(400)
      expect(db.select().from(sources).all()).toEqual([])
    })
  })
})
