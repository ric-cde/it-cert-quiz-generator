import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { ComponentGalleryPage } from './ComponentGalleryPage'
import { HomePage } from './HomePage'

vi.mock('@/lib/highlight', () => ({ highlight: vi.fn(async () => null), resolveLanguage: (language?: string) => language }))
vi.mock('@/lib/settings', () => ({
  useSyntaxHighlighting: () => ({ enabled: true, ready: true, toggle: () => {} }),
}))
vi.mock('@/lib/api', () => ({
  api: {
    api: {
      home: { $get: vi.fn() },
      me: { $get: vi.fn(async () => Response.json({ id: 1, name: 'Admin', role: 'admin' })) },
      exams: { ':id': { status: { $put: vi.fn(async () => Response.json({ ok: true })) } } },
    },
  },
}))

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const progress = (correct: number, incorrect: number, total: number) => ({ correct, incorrect, total })
const overview = {
  subjects: [
    {
      id: 1,
      name: 'OutSystems',
      exams: [
        {
          id: 2,
          name: 'Associate Developer (O11)',
          status: 'active',
          progress: progress(3, 1, 10),
          sources: [{ id: 7, name: 'Practice exam', progress: progress(3, 1, 10) }],
        },
        { id: 3, name: 'An empty exam', status: 'active', progress: progress(0, 0, 0), sources: [] },
      ],
    },
  ],
  passed: [{ id: 4, name: 'A passed exam', status: 'passed', progress: progress(9, 1, 10), sources: [] }],
  abandoned: [{ id: 5, name: 'An abandoned exam', status: 'abandoned', progress: progress(1, 1, 10), sources: [] }],
  unfinished: [
    {
      id: 9,
      exam: 'Associate Developer (O11)',
      label: 'Random',
      feedback: 'at_end',
      position: 2,
      total: 20,
      // Long enough ago to show its date rather than its day.
      startedAt: new Date(2025, 10, 19, 18, 35).toISOString(),
    },
  ],
}

describe('HomePage', () => {
  it('shows each subject, its exams and their sources with progress', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(Response.json(overview) as never)
    renderPage(<HomePage />)

    expect(await screen.findByRole('heading', { name: 'OutSystems' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Practise Associate Developer (O11)' })).toHaveAttribute('href', '/exam/2')
    expect(screen.getByRole('progressbar', { name: 'Practice exam progress' })).toHaveAttribute('aria-valuenow', '30')
    expect(screen.getByText('No questions yet')).toBeInTheDocument()
  })

  it('links to an unfinished quiz', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(Response.json(overview) as never)
    renderPage(<HomePage />)
    expect(await screen.findByRole('link', { name: 'Resume Random: 2 of 20 done' })).toHaveAttribute('href', '/quiz/9')
    expect(screen.getByText('18:35 · Nov 19')).toBeInTheDocument()
    expect(screen.getByText(/^2 of 20/)).toHaveTextContent('2 of 20 done')
    expect(screen.queryByText(/at the end/)).not.toBeInTheDocument()
  })

  it('offers Import and Review to an admin', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(Response.json(overview) as never)
    renderPage(<HomePage />)
    expect(await screen.findByRole('link', { name: 'Review flagged' })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/import')
  })

  it('opens the exam from anywhere on its card, and a source with just that source picked', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(Response.json(overview) as never)
    renderPage(<HomePage />)
    expect(await screen.findByRole('link', { name: 'Practice exam' })).toHaveAttribute('href', '/exam/2?sources=7')
  })

  it('lists passed exams below, and keeps abandoned ones folded away until asked for', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(Response.json(overview) as never)
    const user = userEvent.setup()
    renderPage(<HomePage />)

    const passed = await screen.findByRole('region', { name: 'Passed' })
    expect(within(passed).getByRole('heading', { name: /A passed exam/ })).toHaveTextContent('Passed')
    expect(screen.queryByText('An abandoned exam')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abandoned exams (1)' }))
    expect(screen.getByText('An abandoned exam')).toBeInTheDocument()
  })

  it('marks an exam as passed from its menu', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(Response.json(overview) as never)
    const user = userEvent.setup()
    renderPage(<HomePage />)

    await user.click(await screen.findByRole('button', { name: 'More for Associate Developer (O11)' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as passed' }))
    expect(api.api.exams[':id'].status.$put).toHaveBeenCalledWith({ param: { id: '2' }, json: { status: 'passed' } })
  })

  it('says so when the server fails', async () => {
    vi.mocked(api.api.home.$get).mockResolvedValue(new Response(null, { status: 500 }) as never)
    renderPage(<HomePage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Server responded with 500')
  })
})

describe('ComponentGalleryPage', () => {
  it('has a link to every section, and every link has a target', () => {
    const { container } = renderPage(<ComponentGalleryPage />)
    const links = within(screen.getByRole('navigation', { name: 'Gallery sections' })).getAllByRole('link')
    expect(links.length).toBeGreaterThan(10)
    for (const link of links) {
      expect(container.querySelector(link.getAttribute('href')!)).not.toBeNull()
    }
  })

  describe('Try it', () => {
    const tryIt = () => within(document.getElementById('try-it')!)

    it('marks a wrong answer, shows the right one, and shows all per-answer text', async () => {
      const user = userEvent.setup()
      renderPage(<ComponentGalleryPage />)

      expect(tryIt().getByRole('button', { name: /^Submit/ })).toBeDisabled()
      await user.click(tryIt().getByRole('radio', { name: (name) => name.startsWith('[3]') }))
      await user.click(tryIt().getByRole('button', { name: /^Submit/ }))

      expect(tryIt().getByText('Your answer')).toBeInTheDocument()
      expect(tryIt().getByText('Marked incorrect')).toBeInTheDocument()
      expect(tryIt().getByText('Correct answer')).toBeInTheDocument()
      expect(tryIt().getByText(/This is the list after the first call only/)).toBeInTheDocument()
      for (const radio of tryIt().getAllByRole('radio')) expect(radio).toBeDisabled()
    })

    it('after a reveal shows only the correct answer and its text', async () => {
      const user = userEvent.setup()
      renderPage(<ComponentGalleryPage />)

      await user.click(tryIt().getByRole('button', { name: /^Reveal answer/ }))

      expect(tryIt().getByText('Revealed')).toBeInTheDocument()
      expect(tryIt().getByText(/The first call removes the value 1/)).toBeInTheDocument()
      expect(tryIt().queryByText(/This is the list after the first call only/)).not.toBeInTheDocument()
    })

    it('scores multi-answer all-or-nothing: right options plus an extra is incorrect', async () => {
      const user = userEvent.setup()
      renderPage(<ComponentGalleryPage />)
      await user.click(tryIt().getByRole('button', { name: /^Reveal answer/ }))
      await user.click(tryIt().getByRole('button', { name: /^Next/ }))

      await user.click(tryIt().getByRole('checkbox', { name: /implement interfaces/ }))
      await user.click(tryIt().getByRole('checkbox', { name: /implicitly/ }))
      await user.click(tryIt().getByRole('checkbox', { name: /extend another class/ }))
      await user.click(tryIt().getByRole('button', { name: /^Submit/ }))

      expect(tryIt().getByText('Incorrect')).toBeInTheDocument()
    })
  })

  it('Random clears tile selections, and clicking a tile turns Random off', async () => {
    const user = userEvent.setup()
    renderPage(<ComponentGalleryPage />)
    const tiles = within(document.getElementById('tiles')!)
    const random = tiles.getAllByRole('button', { name: /^Random/ })[0]!
    const oop = tiles.getByRole('button', { name: /^Object-Oriented Programming/ })

    expect(oop).toHaveAttribute('aria-pressed', 'true')
    await user.click(random)
    expect(random).toHaveAttribute('aria-pressed', 'true')
    expect(oop).toHaveAttribute('aria-pressed', 'false')

    await user.click(oop)
    expect(random).toHaveAttribute('aria-pressed', 'false')
    expect(oop).toHaveAttribute('aria-pressed', 'true')
  })
})
