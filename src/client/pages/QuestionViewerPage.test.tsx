import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/AppShell'
import { api } from '@/lib/api'
import { FeatureOverride } from '@/lib/features'
import type { ViewerData, ViewerHistory } from '@shared/question-viewer'
import { QuestionViewerPage } from './QuestionViewerPage'

vi.mock('@/lib/api', () => ({
  api: {
    api: {
      me: { $get: vi.fn() },
      sources: { $get: vi.fn() },
      dev: { sources: { ':id': { questions: { $get: vi.fn() } } } },
    },
  },
}))

const getMe = vi.mocked(api.api.me.$get)
const getSources = vi.mocked(api.api.sources.$get)
const getQuestions = vi.mocked(api.api.dev.sources[':id'].questions.$get)

const question = (externalId: string, history: Partial<ViewerHistory> = {}) => ({
  externalId,
  category: 'Logic',
  type: 'free_form' as const,
  bodyMd: `${externalId}?`,
  modelAnswerMd: 'Model',
  history: { attempts: 0, correct: 0, starred: false, ...history },
})

const DATA: ViewerData = {
  exam: 'Exam A',
  source: 'Alpha',
  chapters: [
    { name: 'One', questions: [question('never'), question('first-time', { attempts: 1, correct: 1 })] },
    {
      name: 'Two',
      questions: [question('wrong-then-right', { attempts: 2, correct: 1 }), question('starred', { starred: true })],
    },
  ],
}

function renderApp(path: string, starredQuestions = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <FeatureOverride flags={{ starredQuestions }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Home</p>} />
              <Route path="dev/questions" element={<QuestionViewerPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureOverride>
    </QueryClientProvider>,
  )
}

/** The external ids in the JSON on screen, in order. */
const shownIds = () => {
  const data = JSON.parse(document.querySelector('pre code')!.textContent!) as ViewerData
  return data.chapters.flatMap((chapter) => chapter.questions.map((q) => q.externalId))
}

beforeEach(() => {
  vi.clearAllMocks()
  getMe.mockImplementation(async () => Response.json({ id: 1, name: 'Admin', role: 'admin' }) as never)
  getSources.mockImplementation(
    async () =>
      Response.json([
        { id: 3, exam: 'Exam A', name: 'Alpha', questions: 4 },
        { id: 5, exam: 'Exam B', name: 'Beta', questions: 9 },
      ]) as never,
  )
  getQuestions.mockImplementation(async () => Response.json(DATA) as never)
})

describe('footer link', () => {
  it('shows the question viewer to an admin, beside the other developer views', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Question viewer' })).toHaveAttribute('href', '/dev/questions')
  })

  it('hides it from anyone else', async () => {
    getMe.mockImplementation(async () => Response.json({ id: 2, name: 'L', role: 'learner' }) as never)
    renderApp('/')
    await screen.findByText('Home')
    await new Promise((resolve) => setTimeout(resolve))
    expect(screen.queryByRole('link', { name: 'Question viewer' })).not.toBeInTheDocument()
  })
})

describe('QuestionViewerPage', () => {
  it('lists the sources by exam, and loads nothing until one is chosen', async () => {
    renderApp('/dev/questions')
    expect(await screen.findByRole('option', { name: 'Alpha (4)' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Exam B' })).toContainElement(
      screen.getByRole('option', { name: 'Beta (9)' }),
    )
    expect(getQuestions).not.toHaveBeenCalled()
    expect(document.querySelector('pre')).toBeNull()
  })

  it("shows the chosen source's questions as one piece of JSON", async () => {
    const user = userEvent.setup()
    renderApp('/dev/questions')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Source' }), await screen.findByText('Alpha (4)'))

    expect(await screen.findByText('4 questions')).toBeInTheDocument()
    expect(getQuestions.mock.lastCall![0].param.id).toBe('3')
    expect(JSON.parse(document.querySelector('pre code')!.textContent!)).toEqual(DATA)
  })

  it('copies all of the JSON', async () => {
    const user = userEvent.setup()
    renderApp('/dev/questions?source=3')
    await screen.findByText('4 questions')

    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(JSON.parse(await navigator.clipboard.readText())).toEqual(DATA)
  })

  it('narrows to questions matching any toggle that is on', async () => {
    const user = userEvent.setup()
    renderApp('/dev/questions?source=3')
    await screen.findByText('4 questions')

    await user.click(screen.getByRole('switch', { name: /Incorrect/ }))
    expect(await screen.findByText(/^1 of 4 questions/)).toBeInTheDocument()
    expect(shownIds()).toEqual(['wrong-then-right'])

    await user.click(screen.getByRole('switch', { name: /Starred/ }))
    expect(shownIds()).toEqual(['wrong-then-right', 'starred'])

    await user.click(screen.getByRole('switch', { name: /Incorrect/ }))
    await user.click(screen.getByRole('switch', { name: /Starred/ }))
    await user.click(screen.getByRole('switch', { name: /Correct/ }))
    expect(shownIds()).toEqual(['first-time'])

    await user.click(screen.getByRole('switch', { name: /Correct/ }))
    await user.click(screen.getByRole('switch', { name: /Unsolved/ }))
    expect(shownIds()).toEqual(['never', 'starred'])
  })

  it('opens with the source and toggles in the address', async () => {
    renderApp('/dev/questions?source=3&show=correct,unsolved')
    expect(await screen.findByText(/^3 of 4 questions/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Correct/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /Unsolved/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /Incorrect/ })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Source' })).toHaveValue('3')
  })

  it('says so when nothing matches, with no JSON to copy', async () => {
    getQuestions.mockImplementation(
      async () => Response.json({ ...DATA, chapters: [{ name: 'One', questions: [question('never')] }] }) as never,
    )
    renderApp('/dev/questions?source=3&show=correct')
    expect(await screen.findByText(/^0 of 1 question,/)).toBeInTheDocument()
    expect(document.querySelector('pre')).toBeNull()
  })

  it('has no Starred toggle when starred questions are switched off', async () => {
    renderApp('/dev/questions?source=3&show=starred', false)
    expect(await screen.findByText('4 questions')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Starred/ })).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Unsolved/ })).toBeInTheDocument()
  })

  it('explains a source that does not exist', async () => {
    getQuestions.mockImplementation(async () => new Response(null, { status: 404 }) as never)
    renderApp('/dev/questions?source=99')
    expect(await screen.findByRole('alert')).toHaveTextContent("There's no source with that number.")
  })

  it('explains when you lack the role', async () => {
    getSources.mockImplementation(async () => new Response(null, { status: 403 }) as never)
    getQuestions.mockImplementation(async () => new Response(null, { status: 403 }) as never)
    renderApp('/dev/questions?source=3')
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Only admins can see this.')
  })
})
