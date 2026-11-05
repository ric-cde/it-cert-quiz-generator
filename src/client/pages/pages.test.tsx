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
      health: { $get: vi.fn() },
      quizzes: { 'start-options': { $get: vi.fn(async () => Response.json({ sources: [], unfinished: [] })) } },
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

describe('HomePage', () => {
  it('shows data loaded from the server', async () => {
    vi.mocked(api.api.health.$get).mockResolvedValue(
      Response.json({ status: 'ok', users: [{ name: 'Admin', role: 'admin' }] }) as never,
    )
    renderPage(<HomePage />)
    expect(await screen.findByText(/Admin \(admin\)/)).toBeInTheDocument()
  })

  it('says so when the server fails', async () => {
    vi.mocked(api.api.health.$get).mockResolvedValue(new Response(null, { status: 500 }) as never)
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
