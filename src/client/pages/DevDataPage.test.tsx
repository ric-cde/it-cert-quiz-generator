import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/AppShell'
import { DataCell } from '@/components/DataTable'
import { api } from '@/lib/api'
import { HttpError, shouldRetry } from '@/lib/http'
import { DevDataPage } from './DevDataPage'

vi.mock('@/lib/api', () => ({
  api: {
    api: {
      me: { $get: vi.fn() },
      dev: { tables: { $get: vi.fn(), ':name': { $get: vi.fn() } } },
    },
  },
}))

const getTable = vi.mocked(api.api.dev.tables[':name'].$get)
const getTables = vi.mocked(api.api.dev.tables.$get)
const getMe = vi.mocked(api.api.me.$get)

const tableResponse = (overrides: object = {}) =>
  Response.json({
    name: 'users',
    columns: ['id', 'name'],
    rows: [{ id: 1, name: 'Admin' }],
    total: 45,
    page: 1,
    pageCount: 3,
    pageSize: 20,
    sort: 'id',
    dir: 'asc',
    ...overrides,
  }) as never

function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<p>Home</p>} />
            <Route path="dev/data/:table?" element={<DevDataPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const lastTableCall = () => getTable.mock.lastCall![0]

beforeEach(() => {
  vi.clearAllMocks()
  getMe.mockImplementation(async () => Response.json({ id: 1, name: 'Admin', role: 'admin' }) as never)
  getTables.mockImplementation(
    async () =>
      Response.json([
        { name: 'users', rowCount: 1 },
        { name: 'categories', rowCount: 24 },
      ]) as never,
  )
  getTable.mockImplementation(async () => tableResponse())
})

describe('footer links', () => {
  it('shows the developer views to an admin', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Data inspector' })).toHaveAttribute('href', '/dev/data')
    expect(screen.getByRole('link', { name: 'Component gallery' })).toHaveAttribute('href', '/dev/components')
  })

  it('hides them from anyone else', async () => {
    getMe.mockImplementation(async () => Response.json({ id: 2, name: 'L', role: 'learner' }) as never)
    renderApp('/')
    await vi.waitFor(() => expect(getMe).toHaveBeenCalled())
    await screen.findByText('Home')
    await new Promise((resolve) => setTimeout(resolve))
    expect(screen.queryByRole('link', { name: 'Data inspector' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Component gallery' })).not.toBeInTheDocument()
  })
})

describe('DevDataPage', () => {
  it('opens on the users table, and lists every table with its row count', async () => {
    renderApp('/dev/data')
    expect(await screen.findByRole('cell', { name: 'Admin' })).toBeInTheDocument()
    expect(lastTableCall().param.name).toBe('users')

    const nav = within(screen.getByRole('navigation', { name: 'Tables' }))
    expect(await nav.findByRole('link', { name: /categories\s*24/ })).toHaveAttribute('href', '/dev/data/categories')
  })

  it('opens the table named in the address', async () => {
    getTable.mockImplementation(async () => tableResponse({ name: 'categories' }))
    renderApp('/dev/data/categories')
    await screen.findByRole('heading', { name: 'categories' })
    await screen.findByRole('region', { name: 'categories' })
    expect(lastTableCall().param.name).toBe('categories')
  })

  it('sorts by a clicked column, then reverses on a second click', async () => {
    const user = userEvent.setup()
    getTable.mockImplementation(async (args) =>
      tableResponse({ sort: args.query.sort ?? 'id', dir: args.query.dir ?? 'asc' }),
    )
    renderApp('/dev/data/users')

    await user.click(await screen.findByRole('button', { name: 'name' }))
    await vi.waitFor(() => expect(lastTableCall().query).toMatchObject({ sort: 'name', dir: 'asc' }))
    expect(await screen.findByRole('columnheader', { name: 'name' })).toHaveAttribute('aria-sort', 'ascending')

    await user.click(screen.getByRole('button', { name: 'name' }))
    await vi.waitFor(() => expect(lastTableCall().query).toMatchObject({ sort: 'name', dir: 'desc' }))
  })

  it('moves between pages and keeps the sort', async () => {
    const user = userEvent.setup()
    getTable.mockImplementation(async (args) =>
      tableResponse({ page: Number(args.query.page), sort: args.query.sort ?? 'id', dir: args.query.dir ?? 'asc' }),
    )
    renderApp('/dev/data/users?sort=name&dir=desc')

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
    expect(lastTableCall().query).toMatchObject({ page: '2', sort: 'name', dir: 'desc' })
  })

  it('reloads the table and the row counts on Refresh', async () => {
    const user = userEvent.setup()
    renderApp('/dev/data/users')
    await screen.findByRole('cell', { name: 'Admin' })
    const [tableCalls, listCalls] = [getTable.mock.calls.length, getTables.mock.calls.length]

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await vi.waitFor(() => {
      expect(getTable.mock.calls.length).toBeGreaterThan(tableCalls)
      expect(getTables.mock.calls.length).toBeGreaterThan(listCalls)
    })
  })

  it('shows column headings and a message for an empty table', async () => {
    getTable.mockImplementation(async () => tableResponse({ rows: [], total: 0, pageCount: 1 }))
    renderApp('/dev/data/users')
    expect(await screen.findByText('No rows yet')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'name' })).toBeInTheDocument()
  })

  it('explains an unknown table', async () => {
    getTable.mockImplementation(async () => new Response(null, { status: 404 }) as never)
    renderApp('/dev/data/nope')
    expect(await screen.findByRole('alert')).toHaveTextContent(`There's no table called "nope".`)
  })

  it('explains when you lack the role', async () => {
    getTable.mockImplementation(async () => new Response(null, { status: 403 }) as never)
    getTables.mockImplementation(async () => new Response(null, { status: 403 }) as never)
    renderApp('/dev/data')
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Only admins can see this.')
  })
})

describe('DataCell', () => {
  it.each([
    [null, 'null'],
    [true, 'true'],
    [false, 'false'],
    [0, '0'],
    ['', ''],
    [[1, 2], '[ 1, 2 ]'],
  ])('shows %j as stored', (value, text) => {
    const { container } = render(<DataCell value={value} />)
    expect(container.textContent?.replace(/\s+/g, ' ')).toBe(text)
  })

  it('folds a long value away but keeps all of it', () => {
    const long = 'x'.repeat(200)
    const { container } = render(<DataCell value={long} />)
    expect(screen.getByText(/200 characters/)).toBeInTheDocument()
    expect(container.querySelector('details p')).toHaveTextContent(long)
  })
})

describe('shouldRetry', () => {
  it('retries while the server may still be starting, then gives up', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(0, new HttpError(500))).toBe(true)
    expect(shouldRetry(8, new HttpError(500))).toBe(false)
  })

  it.each([400, 403, 404])('does not retry a %i', (status) => {
    expect(shouldRetry(0, new HttpError(status))).toBe(false)
  })
})
