import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeBlock } from '@/components/CodeBlock'
import { api } from './api'

vi.mock('./api', () => ({ api: { api: { settings: { $get: vi.fn(), $patch: vi.fn() } } } }))
vi.mock('./highlight', () => ({
  highlight: vi.fn(async (code: string) => `<pre class="shiki"><code>highlighted:${code}</code></pre>`),
  resolveLanguage: (language?: string) => language,
}))

const getSettings = vi.mocked(api.api.settings.$get)
const patchSettings = vi.mocked(api.api.settings.$patch)
const respondWith = (syntaxHighlighting: boolean) => Response.json({ syntaxHighlighting }) as never

function renderTwoBlocks() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <CodeBlock code="first" language="java" />
      <CodeBlock code="second" language="java" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getSettings.mockImplementation(async () => respondWith(true))
  patchSettings.mockImplementation(async () => respondWith(false))
})

describe('the syntax highlighting setting', () => {
  it('starts from the saved setting', async () => {
    getSettings.mockImplementation(async () => respondWith(false))
    renderTwoBlocks()
    const [toggle] = await screen.findAllByRole('button', { name: 'Syntax highlighting' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.queryByText('highlighted:first')).not.toBeInTheDocument()
  })

  it('applies to every code block at once, and saves the choice', async () => {
    const user = userEvent.setup()
    renderTwoBlocks()
    await screen.findByText('highlighted:first')
    await screen.findByText('highlighted:second')

    await user.click(screen.getAllByRole('button', { name: 'Syntax highlighting' })[0]!)

    expect(await screen.findByText('first')).toBeInTheDocument()
    expect(screen.getByText('second')).toBeInTheDocument()
    expect(patchSettings).toHaveBeenCalledWith({ json: { syntaxHighlighting: false } })
  })

  it('goes back if the choice cannot be saved', async () => {
    const user = userEvent.setup()
    patchSettings.mockImplementation(async () => new Response(null, { status: 500 }) as never)
    renderTwoBlocks()
    await screen.findByText('highlighted:first')

    await user.click(screen.getAllByRole('button', { name: 'Syntax highlighting' })[0]!)

    await waitFor(() => expect(patchSettings).toHaveBeenCalled())
    expect(await screen.findByText('highlighted:first')).toBeInTheDocument()
  })
})
