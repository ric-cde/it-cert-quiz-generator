import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReviewNotice } from '@/components/ReviewNotice'
import { api } from '@/lib/api'
import type { QuestionToReview } from '../../shared/review'
import { ReviewPage } from './ReviewPage'

vi.mock('@/lib/api', () => ({
  api: { api: { review: { $get: vi.fn(), ':id': { $post: vi.fn() } } } },
}))

const getReview = vi.mocked(api.api.review.$get)
const postReview = vi.mocked(api.api.review[':id'].$post)
const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

const question = (overrides: Partial<QuestionToReview> = {}): QuestionToReview => ({
  id: 5,
  exam: 'An exam',
  source: 'A source',
  sourceId: 2,
  chapter: 'One',
  type: 'single',
  explanationMd: null,
  externalId: 'q5',
  bodyMd: 'What does it print?',
  modelAnswerMd: null,
  reviewNote: 'The source says A, but it prints B.',
  options: [
    { id: 10, bodyMd: 'Option A', isCorrect: true, explanationMd: null, explanationOrigin: null },
    { id: 11, bodyMd: 'Option B', isCorrect: false, explanationMd: null, explanationOrigin: null },
  ],
  ...overrides,
})

function renderPage(path = '/review') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ReviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const stateOf = (text: string) => screen.getByText(text).closest('[data-state]')

beforeEach(() => {
  vi.clearAllMocks()
  getReview.mockImplementation(async () => json([question()]))
  postReview.mockImplementation(async () => json({ ok: true }))
})

describe('ReviewPage', () => {
  it('shows why it needs review, the question and the marked answer', async () => {
    renderPage()

    expect(await screen.findByText('The source says A, but it prints B.')).toBeInTheDocument()
    expect(screen.getByText('What does it print?')).toBeInTheDocument()
    expect(stateOf('Option A')).toHaveAttribute('data-state', 'correct-missed')
    expect(stateOf('Option B')).toHaveAttribute('data-state', 'neutral')
  })

  it('limits the list to a source from the address, with a way to see them all', async () => {
    renderPage('/review?source=2')

    await screen.findByText('What does it print?')
    expect(getReview).toHaveBeenCalledWith({ query: { sourceId: '2' } })
    expect(screen.getByRole('link', { name: 'Show every source' })).toHaveAttribute('href', '/review')
  })

  it('says when nothing is left', async () => {
    getReview.mockImplementation(async () => json([]))
    renderPage()
    expect(await screen.findByText(/Nothing left to review/)).toBeInTheDocument()
  })

  it('keeps a question as it is', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: "It's fine, keep it" }))
    expect(postReview).toHaveBeenCalledWith({ param: { id: '5' }, json: { action: 'keep' } })
  })

  it('takes a question out of quizzes', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Take out of quizzes' }))
    expect(postReview).toHaveBeenCalledWith({ param: { id: '5' }, json: { action: 'take-out' } })
  })

  it('changes a single answer: picking one replaces the other', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Change the answer' }))

    expect(stateOf('Option A')).toHaveAttribute('data-state', 'selected')
    await user.click(screen.getByText('Option B'))
    expect(stateOf('Option A')).toHaveAttribute('data-state', 'idle')
    expect(stateOf('Option B')).toHaveAttribute('data-state', 'selected')

    await user.click(screen.getByRole('button', { name: 'Save this answer' }))
    expect(postReview).toHaveBeenCalledWith({ param: { id: '5' }, json: { action: 'change-answer', correctOptionIds: [11] } })
  })

  it('changes a multi-answer question: options toggle, and at least one is needed', async () => {
    getReview.mockImplementation(async () => json([question({ type: 'multi' })]))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Change the answer' }))

    await user.click(screen.getByText('Option A'))
    expect(screen.getByRole('button', { name: 'Save this answer' })).toBeDisabled()

    await user.click(screen.getByText('Option B'))
    await user.click(screen.getByText('Option A'))
    await user.click(screen.getByRole('button', { name: 'Save this answer' }))
    expect(postReview).toHaveBeenCalledWith({ param: { id: '5' }, json: { action: 'change-answer', correctOptionIds: [11, 10] } })
  })

  it('can back out of changing the answer', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Change the answer' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(stateOf('Option A')).toHaveAttribute('data-state', 'correct-missed')
    expect(postReview).not.toHaveBeenCalled()
  })

  it('shows a free-form question with its model answer, and no way to change an option', async () => {
    getReview.mockImplementation(async () =>
      json([question({ type: 'free_form', options: [], modelAnswerMd: 'Because of this.' })]),
    )
    renderPage()

    expect(await screen.findByText('Because of this.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change the answer' })).not.toBeInTheDocument()
  })

  it('says when saving fails', async () => {
    postReview.mockImplementation(async () => json({}, 500))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: "It's fine, keep it" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server responded with 500')
  })
})

describe('ReviewNotice', () => {
  const note = 'The source says A, but it prints B.'

  it('warns before answering, without giving away the answer', () => {
    render(<ReviewNotice note={note} answered={false} />)
    expect(screen.getByText(/answer to this question is in doubt/)).toBeInTheDocument()
    expect(screen.queryByText(/prints B/)).not.toBeInTheDocument()
  })

  it('gives the reason once answered', () => {
    render(<ReviewNotice note={note} answered />)
    expect(screen.getByText(/prints B/)).toBeInTheDocument()
  })
})
