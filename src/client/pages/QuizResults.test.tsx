import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { QuizState, ReviewEntry } from '../../shared/quiz'
import { QuizResults } from './QuizResults'

vi.mock('@/lib/highlight', () => ({ highlight: vi.fn(async () => null), resolveLanguage: (language?: string) => language }))
vi.mock('@/lib/settings', () => ({
  useSyntaxHighlighting: () => ({ enabled: false, ready: true, toggle: () => {} }),
}))
vi.mock('@/lib/api', () => ({
  api: { api: { quizzes: { ':id': { review: { $get: vi.fn() }, retry: { $post: vi.fn() } } } } },
}))

const getReview = vi.mocked(api.api.quizzes[':id'].review.$get)
const postRetry = vi.mocked(api.api.quizzes[':id'].retry.$post)
const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

const finished = (missed: number, feedback: QuizState['feedback'] = 'after_each'): QuizState => ({
  id: 5,
  exam: 'An exam',
  feedback,
  total: 4,
  position: 4,
  finished: true,
  current: null,
  results: { correct: 2, incorrect: 1, revealed: 0, skipped: 1, notReached: 0 },
  summary: {
    byCategory: [
      { name: 'Data', correct: 0, asked: 2 },
      { name: 'Logic', correct: 2, asked: 2 },
    ],
    missed,
    examId: 2,
    label: 'Random',
  },
})

const entry = (number: number, outcome: ReviewEntry['outcome'], overrides: Partial<ReviewEntry> = {}): ReviewEntry => ({
  number,
  questionId: number * 10,
  type: 'single',
  bodyMd: `Question body ${number}`,
  source: 'A source',
  category: 'Logic',
  outcome,
  options: [
    { id: number * 10 + 1, bodyMd: `Right ${number}`, isCorrect: true, chosen: outcome === 'correct', explanationMd: null },
    { id: number * 10 + 2, bodyMd: `Wrong ${number}`, isCorrect: false, chosen: outcome === 'incorrect', explanationMd: `Why wrong ${number}` },
  ],
  explanationMd: null,
  reviewNote: null,
  ...overrides,
})

function renderResults(state: QuizState) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/quiz/5']}>
        <Routes>
          <Route path="/quiz/5" element={<QuizResults quiz={state} />} />
          <Route path="/quiz/:id" element={<p>The retry</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getReview.mockImplementation(async () =>
    json([entry(1, 'correct'), entry(2, 'incorrect'), entry(3, 'skipped', { options: entry(3, 'skipped').options.map((o) => ({ ...o, explanationMd: null })) })]),
  )
  postRetry.mockImplementation(async () => json({ id: 6 }, 201))
})

describe('QuizResults', () => {
  it('shows the score and each category, weakest first', () => {
    renderResults(finished(2))
    expect(screen.getByText(/2 of 4 correct/)).toBeInTheDocument()
    const bars = screen.getAllByRole('progressbar')
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['Data: 0 of 2 correct', 'Logic: 2 of 2 correct'])
    expect(screen.getByRole('link', { name: 'Practise again' })).toHaveAttribute('href', '/exam/2')
  })

  it('retries the missed questions in one click', async () => {
    renderResults(finished(2))
    await userEvent.click(screen.getByRole('button', { name: /Retry missed \(2\)/ }))
    expect(await screen.findByText('The retry')).toBeInTheDocument()
    expect(postRetry).toHaveBeenCalledWith({ param: { id: '5' } })
  })

  it('offers no retry when nothing was missed', () => {
    renderResults(finished(0))
    expect(screen.queryByRole('button', { name: /Retry missed/ })).not.toBeInTheDocument()
  })

  it('keeps Review answers collapsed, and loads it only when opened', async () => {
    const user = userEvent.setup()
    renderResults(finished(2))
    const toggle = screen.getByRole('button', { name: 'Review answers' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(getReview).not.toHaveBeenCalled()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const second = await screen.findByRole('article', { name: 'Question 2' })
    expect(within(second).getByText('Incorrect')).toBeInTheDocument()
    expect(within(second).getByText('Your answer')).toBeInTheDocument()
    expect(within(second).getByText('Correct answer')).toBeInTheDocument()
    expect(within(second).getByText('Why wrong 2')).toBeInTheDocument()

    const third = screen.getByRole('article', { name: 'Question 3' })
    expect(within(third).getByText('Skipped')).toBeInTheDocument()
    expect(within(third).getByText(/No explanation in this source yet/)).toBeInTheDocument()
  })

  it('opens Review answers by itself after an at-the-end quiz', async () => {
    renderResults(finished(2, 'at_end'))
    expect(screen.getByRole('button', { name: 'Review answers' })).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByRole('article', { name: 'Question 1' })).toBeInTheDocument()
  })

  it('can show only the missed answers', async () => {
    const user = userEvent.setup()
    renderResults(finished(2, 'at_end'))
    await screen.findByRole('article', { name: 'Question 1' })

    await user.click(screen.getByRole('radio', { name: 'Missed only' }))
    expect(screen.queryByRole('article', { name: 'Question 1' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})
