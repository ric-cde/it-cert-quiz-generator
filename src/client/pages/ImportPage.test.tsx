import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { ImportPlan, PlannedQuestion } from '../../shared/import'
import { ImportPage } from './ImportPage'

vi.mock('@/lib/api', () => ({
  api: {
    api: {
      import: { preview: { $post: vi.fn() }, commit: { $post: vi.fn() } },
      sources: { $get: vi.fn(), ':id': { $delete: vi.fn() } },
    },
  },
}))

const postPreview = vi.mocked(api.api.import.preview.$post)
const postCommit = vi.mocked(api.api.import.commit.$post)
const getSources = vi.mocked(api.api.sources.$get)
const deleteSource = vi.mocked(api.api.sources[':id'].$delete)

const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

const planned = (overrides: Partial<PlannedQuestion> = {}): PlannedQuestion => ({
  action: 'new',
  changes: [],
  warnings: [],
  question: {
    externalId: 'q1',
    type: 'single',
    category: 'Logic',
    bodyMd: 'What is the question?',
    options: [
      { bodyMd: 'The right one', isCorrect: true, explanationMd: 'Because it is.', explanationOrigin: 'generated' },
      { bodyMd: 'The wrong one', isCorrect: false },
    ],
  },
  ...overrides,
})

const plan = (overrides: Partial<ImportPlan> = {}): ImportPlan => ({
  ok: true,
  exam: 'An exam',
  source: { name: 'A source', origin: 'upload', trust: null, reference: null, exists: false },
  categories: [{ name: 'Logic', count: 1, status: 'official', target: { id: 1, name: 'Logic', parent: null, official: true } }],
  examCategories: [
    { id: 1, name: 'Logic', parent: null, official: true },
    { id: 2, name: 'Forms', parent: 'Logic', official: true },
  ],
  chapters: [{ name: 'Chapter 1', questions: [planned()] }],
  counts: { new: 1, updated: 0, unchanged: 0, deleted: 0, duplicates: 0, toReview: 0, total: 1 },
  omitted: [],
  warnings: [],
  notInFile: 0,
  ...overrides,
})

const result = { ok: true, sourceId: 1, added: 1, updated: 0, unchanged: 0, skippedDuplicates: 0, skippedDeleted: 0, notImportedByLimit: 0, toReview: 0 }

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function chooseFile(contents = '{"formatVersion": 1}', name = 'bank.json') {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText(/Choose a question bank file/), new File([contents], name, { type: 'application/json' }))
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  getSources.mockImplementation(async () => json([]))
  postPreview.mockImplementation(async () => json(plan()))
  postCommit.mockImplementation(async () => json(result))
})

describe('ImportPage', () => {
  it('sends the file for checking, and shows what it would do', async () => {
    renderPage()
    await chooseFile()

    expect(await screen.findByRole('heading', { name: 'A source' })).toBeInTheDocument()
    expect(postPreview).toHaveBeenCalledWith({ json: { bank: { formatVersion: 1 } } })
    expect(screen.getByText(/Nothing is saved yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import 1 question' })).toBeInTheDocument()
    expect(postCommit).not.toHaveBeenCalled()
  })

  it('explains a broken file without calling the server', async () => {
    renderPage()
    await chooseFile('{"chapters": [', 'broken.json')

    expect(await screen.findByRole('alert')).toHaveTextContent(/broken\.json.*cut off/)
    expect(postPreview).not.toHaveBeenCalled()
  })

  it('lists problems, and offers no way to import', async () => {
    postPreview.mockImplementation(async () =>
      json({ ok: false, problems: [{ location: 'Chapter 1, question 3', message: 'Needs a correct option' }] }),
    )
    renderPage()
    await chooseFile()

    expect(await screen.findByRole('heading', { name: /can't be imported yet/ })).toBeInTheDocument()
    expect(screen.getByText(/Needs a correct option/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument()
    // The file can be fixed and chosen again.
    expect(screen.getByLabelText(/Choose a question bank file/)).toBeInTheDocument()
  })

  it('shows warnings and what was left out', async () => {
    postPreview.mockImplementation(async () =>
      json(
        plan({
          warnings: [{ location: 'Chapter 1', message: 'Question numbers 4 are missing.' }],
          omitted: [{ reference: 'Question 17', reason: 'Depends on an image' }],
        }),
      ),
    )
    renderPage()
    await chooseFile()

    expect(await screen.findByText(/Question numbers 4 are missing/)).toBeInTheDocument()
    expect(screen.getByText(/Depends on an image/)).toBeInTheDocument()
    // A warning doesn't stop the import.
    expect(screen.getByRole('button', { name: 'Import 1 question' })).toBeEnabled()
  })

  it('draws a chapter only when opened, with the answer and its origin showing', async () => {
    const user = userEvent.setup()
    renderPage()
    await chooseFile()

    await screen.findByRole('heading', { name: 'A source' })
    expect(screen.queryByText('What is the question?')).not.toBeInTheDocument()

    const summary = screen.getByText('Chapter 1')
    await user.click(summary)
    // jsdom doesn't fire the toggle event, so send it as a browser would.
    const details = summary.closest('details')!
    details.open = true
    details.dispatchEvent(new Event('toggle'))

    expect(await screen.findByText('What is the question?')).toBeInTheDocument()
    expect(screen.getByText('The right one').closest('[data-state]')).toHaveAttribute('data-state', 'correct-missed')
    expect(screen.getByText('The wrong one').closest('[data-state]')).toHaveAttribute('data-state', 'neutral')
    expect(screen.getByText('Written by AI')).toBeInTheDocument()
  })

  it('imports only when asked, then reports what happened', async () => {
    renderPage()
    const user = await chooseFile()

    await user.click(await screen.findByRole('button', { name: 'Import 1 question' }))

    expect(await screen.findByRole('status')).toHaveTextContent('1 question added.')
    expect(postCommit).toHaveBeenCalledWith({ json: { bank: { formatVersion: 1 }, includeDuplicates: false, categoryChoices: {} } })
    expect(screen.getByRole('link', { name: /data inspector/ })).toHaveAttribute('href', '/dev/data/questions')
  })

  it('signposts questions to review after importing', async () => {
    postCommit.mockImplementation(async () => json({ ...result, sourceId: 4, toReview: 2 }))
    renderPage()
    const user = await chooseFile()

    await user.click(await screen.findByRole('button', { name: 'Import 1 question' }))

    expect(await screen.findByText('2 questions in this source need your review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review them now' })).toHaveAttribute('href', '/review?source=4')
  })

  it('says nothing about reviewing when there is nothing to review', async () => {
    renderPage()
    const user = await chooseFile()

    await user.click(await screen.findByRole('button', { name: 'Import 1 question' }))

    await screen.findByRole('status')
    expect(screen.queryByText(/need your review|needs your review/)).not.toBeInTheDocument()
  })

  describe('categories', () => {
    const withNames = () =>
      plan({
        categories: [
          { name: 'Logic', count: 3, status: 'official', target: { id: 1, name: 'Logic', parent: null, official: true } },
          { name: 'forms', count: 2, status: 'new', suggestion: { id: 2, name: 'Forms', parent: 'Logic', official: true } },
          { name: 'Odd one', count: 1, status: 'new' },
        ],
      })

    it("lists each name with whether it's the exam's own, and offers a place for new ones", async () => {
      postPreview.mockImplementation(async () => json(withNames()))
      renderPage()
      await chooseFile()

      expect(await screen.findByText(/2 names aren't one of this exam's/)).toBeInTheDocument()
      expect(screen.getByText('Official category')).toBeInTheDocument()
      expect(screen.getAllByText('New to this exam')).toHaveLength(2)
      expect(screen.queryByRole('combobox', { name: /"Logic"/ })).not.toBeInTheDocument()
      // A near match is suggested, and anything else is kept as it is.
      expect(screen.getByRole('combobox', { name: /"forms"/ })).toHaveDisplayValue('Logic › Forms')
      expect(screen.getByRole('combobox', { name: /"Odd one"/ })).toHaveDisplayValue('Keep as a new unofficial category')
    })

    it('sends the choices with the import', async () => {
      postPreview.mockImplementation(async () => json(withNames()))
      renderPage()
      const user = await chooseFile()

      await user.selectOptions(await screen.findByRole('combobox', { name: /"Odd one"/ }), 'Logic')
      await user.click(screen.getByRole('button', { name: 'Import 1 question' }))

      expect(postCommit).toHaveBeenCalledWith({
        json: {
          bank: { formatVersion: 1 },
          includeDuplicates: false,
          categoryChoices: { forms: { map: 2 }, 'Odd one': { map: 1 } },
        },
      })
    })

    it('says so when every name is known', async () => {
      renderPage()
      await chooseFile()
      expect(await screen.findByText(/Every name in this file is already known/)).toBeInTheDocument()
    })
  })

  it('shows how far the source can be trusted, and where it comes from', async () => {
    postPreview.mockImplementation(async () =>
      json(plan({ source: { name: 'A source', origin: 'upload', trust: 'official', reference: 'https://example.com/exam', exists: false } })),
    )
    renderPage()
    await chooseFile()

    expect(await screen.findByText('Official')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://example.com/exam' })).toHaveAttribute('href', 'https://example.com/exam')
  })

  it('skips duplicates unless asked, and counts accordingly', async () => {
    postPreview.mockImplementation(async () =>
      json(plan({ counts: { new: 3, updated: 0, unchanged: 0, deleted: 0, duplicates: 1, toReview: 0, total: 3 } })),
    )
    renderPage()
    const user = await chooseFile()

    expect(await screen.findByRole('button', { name: 'Import 2 questions' })).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Also import 1 duplicate' }))
    await user.click(screen.getByRole('button', { name: 'Import 3 questions' }))

    expect(postCommit).toHaveBeenCalledWith({ json: { bank: { formatVersion: 1 }, includeDuplicates: true, categoryChoices: {} } })
  })

  it('offers a trial import only for a file bigger than the trial', async () => {
    postPreview.mockImplementationOnce(async () =>
      json(plan({ counts: { new: 40, updated: 0, unchanged: 0, deleted: 0, duplicates: 0, toReview: 0, total: 40 } })),
    )
    const { unmount } = renderPage()
    const user = await chooseFile()

    await user.click(await screen.findByRole('button', { name: 'Try the first 10 only' }))
    expect(postCommit).toHaveBeenCalledWith({ json: { bank: { formatVersion: 1 }, includeDuplicates: false, categoryChoices: {}, limit: 10 } })
    unmount()

    renderPage()
    await chooseFile()
    await screen.findByRole('button', { name: 'Import 1 question' })
    expect(screen.queryByRole('button', { name: /Try the first/ })).not.toBeInTheDocument()
  })

  it('blocks importing when there is nothing to do', async () => {
    postPreview.mockImplementation(async () =>
      json(plan({ counts: { new: 0, updated: 0, unchanged: 5, deleted: 0, duplicates: 0, toReview: 0, total: 5 } })),
    )
    renderPage()
    await chooseFile()

    expect(await screen.findByRole('button', { name: 'Nothing to import' })).toBeDisabled()
  })

  it('goes back to choosing a file on Cancel', async () => {
    renderPage()
    const user = await chooseFile()

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('heading', { name: 'A source' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Choose a question bank file/)).toBeInTheDocument()
    expect(postCommit).not.toHaveBeenCalled()
  })

  it('shows a clear message when the server fails', async () => {
    postPreview.mockImplementation(async () => json({}, 500))
    renderPage()
    await chooseFile()

    expect(await screen.findByRole('alert')).toHaveTextContent('Server responded with 500')
  })

  describe('sources', () => {
    const source = { id: 7, exam: 'An exam', name: 'Trial', origin: 'upload', trust: null, reference: null, chapters: 2, questions: 30, flagged: 1, toReview: 2, attempts: 0 }

    it('says when there are none', async () => {
      renderPage()
      expect(await screen.findByText('None yet.')).toBeInTheDocument()
    })

    it('links to the questions to review in a source', async () => {
      getSources.mockImplementation(async () => json([source]))
      renderPage()
      expect(await screen.findByRole('link', { name: '2 questions to review' })).toHaveAttribute('href', '/review?source=7')
    })

    it('deletes only after a second press', async () => {
      getSources.mockImplementation(async () => json([source]))
      deleteSource.mockImplementation(async () => json({ ok: true }))
      const user = userEvent.setup()
      renderPage()

      expect(await screen.findByText(/2 chapters, 30 questions, 1 flagged/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Delete Trial' }))
      expect(deleteSource).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))
      expect(deleteSource).toHaveBeenCalledWith({ param: { id: '7' } })
    })

    it('can back out of deleting', async () => {
      getSources.mockImplementation(async () => json([source]))
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: 'Delete Trial' }))
      await user.click(screen.getByRole('button', { name: 'Keep' }))

      expect(deleteSource).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Delete Trial' })).toBeInTheDocument()
    })

    it('offers no delete for a source with attempts', async () => {
      getSources.mockImplementation(async () => json([{ ...source, attempts: 3 }]))
      renderPage()

      const row = (await screen.findByText('Trial')).closest('li')!
      expect(within(row).getByText(/3 attempts, so it can't be deleted/)).toBeInTheDocument()
      expect(within(row).queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
