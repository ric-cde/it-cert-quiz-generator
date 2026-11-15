import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { DEFAULT_FEATURES, FEATURE_KEYS, FEATURES } from '@shared/features'
import { SettingsPage } from './SettingsPage'

vi.mock('@/lib/api', () => ({ api: { api: { settings: { $get: vi.fn(), $patch: vi.fn() } } } }))

const getSettings = vi.mocked(api.api.settings.$get)
const patchSettings = vi.mocked(api.api.settings.$patch)
const saved = { userId: 1, syntaxHighlighting: true, optionOrder: 'labelled', features: DEFAULT_FEATURES }

// A label can hold brackets, such as "(experimental)".
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getSettings.mockImplementation(async () => Response.json(saved) as never)
  patchSettings.mockImplementation(async () => Response.json(saved) as never)
})

describe('SettingsPage', () => {
  it('has a switch for every feature flag, showing what is saved', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Settings' })
    for (const key of FEATURE_KEYS) {
      const toggle = screen.getByRole('switch', { name: new RegExp(`^${escapeRegExp(FEATURES[key].label)}`) })
      expect(toggle).toHaveAttribute('aria-checked', String(DEFAULT_FEATURES[key]))
    }
  })

  it('saves a flag as soon as it changes, and shows the change straight away', async () => {
    const user = userEvent.setup()
    renderPage()
    const toggle = await screen.findByRole('switch', { name: /^Source icons/ })
    await user.click(toggle)
    expect(patchSettings).toHaveBeenCalledWith({ json: { features: { sourceIcons: !DEFAULT_FEATURES.sourceIcons } } })
    expect(toggle).toHaveAttribute('aria-checked', String(!DEFAULT_FEATURES.sourceIcons))
  })

  it('saves syntax highlighting the same way', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('switch', { name: /^Syntax highlighting/ }))
    expect(patchSettings).toHaveBeenCalledWith({ json: { syntaxHighlighting: false } })
  })

  it('keeps lettered options in order by default, and saves another option order straight away', async () => {
    const user = userEvent.setup()
    renderPage()
    const group = await screen.findByRole('radiogroup', { name: 'Option order' })
    expect(within(group).getByRole('radio', { name: 'Lettered in order' })).toBeChecked()

    await user.click(within(group).getByRole('radio', { name: 'Always shuffle' }))
    expect(patchSettings).toHaveBeenCalledWith({ json: { optionOrder: 'shuffle' } })
    expect(within(group).getByRole('radio', { name: 'Always shuffle' })).toBeChecked()
  })

  it('puts a change back and says so when it cannot be saved', async () => {
    patchSettings.mockImplementation(async () => Response.json({ error: 'Down' }, { status: 500 }) as never)
    const user = userEvent.setup()
    renderPage()
    const toggle = await screen.findByRole('switch', { name: /^Question strip/ })
    await user.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't save that/)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })
})
