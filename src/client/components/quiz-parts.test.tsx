import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { QuizResults } from '../../shared/quiz'
import { FlagControl } from './FlagControl'
import { PracticeStart } from './PracticeStart'
import { QuizProgress } from './QuizProgress'
import { QuizScore, quizScore } from './QuizScore'

vi.mock('@/lib/api', () => ({
  api: { api: { quizzes: { 'start-options': { $get: vi.fn() }, $post: vi.fn() } } },
}))

const getOptions = vi.mocked(api.api.quizzes['start-options'].$get)
const postQuiz = vi.mocked(api.api.quizzes.$post)
const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

const results = (overrides: Partial<QuizResults> = {}): QuizResults => ({
  correct: 0,
  incorrect: 0,
  revealed: 0,
  skipped: 0,
  notReached: 0,
  ...overrides,
})

describe('quizScore', () => {
  it('counts skipped and revealed against you, but not questions never reached', () => {
    expect(quizScore(results({ correct: 2, incorrect: 1, revealed: 1, skipped: 1, notReached: 10 }))).toEqual({ asked: 5, percent: 40 })
  })

  it('never rounds up to 100', () => {
    expect(quizScore(results({ correct: 199, incorrect: 1 })).percent).toBe(99)
  })

  it('copes with nothing asked', () => {
    expect(quizScore(results({ notReached: 5 }))).toEqual({ asked: 0, percent: 0 })
  })
})

describe('QuizScore', () => {
  it('lists only what happened', () => {
    render(<QuizScore results={results({ correct: 3, incorrect: 1, notReached: 1 })} />)
    expect(screen.getByText(/3 of 4 correct/)).toBeInTheDocument()
    expect(screen.getByText('1 incorrect, 1 question not reached')).toBeInTheDocument()
  })

  it('says when nothing was answered', () => {
    render(<QuizScore results={results({ notReached: 2 })} />)
    expect(screen.getByText('No questions answered')).toBeInTheDocument()
  })
})

describe('QuizProgress', () => {
  it('reports how far through it is', () => {
    render(<QuizProgress position={3} total={12} />)
    const bar = screen.getByRole('progressbar', { name: 'Quiz progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '12')
  })
})

describe('FlagControl', () => {
  const handlers = () => ({ onFlag: vi.fn(), onUnflag: vi.fn(), onSaveReason: vi.fn() })

  it('flags with one press', async () => {
    const on = handlers()
    render(<FlagControl flagged={false} reason={null} {...on} />)
    await userEvent.click(screen.getByRole('button', { name: 'Flag' }))
    expect(on.onFlag).toHaveBeenCalledOnce()
  })

  it('saves a changed reason only', async () => {
    const on = handlers()
    render(<FlagControl flagged reason="Old" {...on} />)
    const user = userEvent.setup()

    expect(screen.getByLabelText(/What's wrong with it/)).toHaveValue('Old')
    expect(screen.getByRole('button', { name: 'Save reason' })).toBeDisabled()

    await user.type(screen.getByLabelText(/What's wrong with it/), ' news ')
    await user.click(screen.getByRole('button', { name: 'Save reason' }))
    expect(on.onSaveReason).toHaveBeenCalledWith('Old news')
  })

  it('unflags', async () => {
    const on = handlers()
    render(<FlagControl flagged reason={null} {...on} />)
    await userEvent.click(screen.getByRole('button', { name: 'Unflag' }))
    expect(on.onUnflag).toHaveBeenCalledOnce()
  })
})

describe('PracticeStart', () => {
  const source = { id: 3, exam: 'An exam', name: 'Set 1', available: 40 }

  function renderIt() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PracticeStart />} />
            <Route path="/quiz/:id" element={<p>The quiz</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    postQuiz.mockImplementation(async () => json({ id: 9 }, 201))
  })

  it('points to the import screen when there is nothing to practise', async () => {
    getOptions.mockImplementation(async () => json({ sources: [{ ...source, available: 0 }], unfinished: [] }))
    renderIt()
    expect(await screen.findByRole('link', { name: 'Import some questions' })).toHaveAttribute('href', '/import')
    expect(screen.queryByText('Set 1')).not.toBeInTheDocument()
  })

  it('starts a capped quiz and opens it', async () => {
    getOptions.mockImplementation(async () => json({ sources: [source], unfinished: [] }))
    renderIt()

    await userEvent.click(await screen.findByRole('button', { name: 'Start Set 1, feedback at the end' }))

    expect(await screen.findByText('The quiz')).toBeInTheDocument()
    expect(postQuiz).toHaveBeenCalledWith({ json: { sourceId: 3, feedback: 'at_end', limit: 20 } })
  })

  it('sends no cap for All', async () => {
    getOptions.mockImplementation(async () => json({ sources: [source], unfinished: [] }))
    renderIt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('radio', { name: 'All' }))
    await user.click(screen.getByRole('button', { name: 'Start Set 1, feedback after each question' }))

    expect(postQuiz).toHaveBeenCalledWith({ json: { sourceId: 3, feedback: 'after_each' } })
  })

  it('links to an unfinished quiz', async () => {
    getOptions.mockImplementation(async () =>
      json({ sources: [source], unfinished: [{ id: 4, exam: 'An exam', source: 'Set 1', feedback: 'at_end', position: 2, total: 5 }] }),
    )
    renderIt()
    expect(await screen.findByRole('link', { name: 'Resume Set 1: 2 of 5 done' })).toHaveAttribute('href', '/quiz/4')
  })

  it('says when a quiz could not start', async () => {
    getOptions.mockImplementation(async () => json({ sources: [source], unfinished: [] }))
    postQuiz.mockImplementation(async () => json({ error: 'conflict' }, 409))
    renderIt()

    await userEvent.click(await screen.findByRole('button', { name: 'Start Set 1, feedback at the end' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't start that quiz")
  })
})
