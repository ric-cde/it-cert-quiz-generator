import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { DEFAULT_QUIZ_DEFAULTS } from '../../shared/domain'
import type { PracticeData, PracticeQuestion, QuestionHistory } from '../../shared/practice'
import { readSelection, TakeExamPage } from './TakeExamPage'

vi.mock('@/lib/api', () => ({
  api: {
    api: {
      settings: { $get: vi.fn() },
      exams: { ':id': { practice: { $get: vi.fn() } } },
      quizzes: { $post: vi.fn() },
    },
  },
}))

const getSettings = vi.mocked(api.api.settings.$get)
const getPractice = vi.mocked(api.api.exams[':id'].practice.$get)
const postQuiz = vi.mocked(api.api.quizzes.$post)
const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

/**
 * Alpha one (70): 25 new and 2 incorrect questions in Logic.
 * Alpha two (71): 5 new and 5 correct questions in Odd ones.
 * So 37 in all, 30 unanswered.
 */
let nextId = 1
const questions = (count: number, chapterId: number, categoryId: number, history: QuestionHistory): PracticeQuestion[] =>
  Array.from({ length: count }, () => ({ id: nextId++, chapterId, categoryId, history }))

const data: PracticeData = {
  exam: { id: 2, name: 'Associate Developer', subject: 'OutSystems' },
  categories: [
    { id: 1, name: 'Logic', official: true, parentId: null },
    { id: 3, name: 'Empty', official: true, parentId: null },
    { id: 2, name: 'Odd ones', official: false, parentId: null },
  ],
  sources: [{ id: 7, name: 'Alpha' }],
  chapters: [
    { id: 70, name: 'Alpha one', sourceId: 7 },
    { id: 71, name: 'Alpha two', sourceId: 7 },
  ],
  questions: [
    ...questions(25, 70, 1, 'new'),
    ...questions(2, 70, 1, 'incorrect'),
    ...questions(5, 71, 2, 'new'),
    ...questions(5, 71, 2, 'correct'),
  ],
}

/** Shows the address, so tests can check the selection is kept in it. */
function Address() {
  return <p data-testid="address">{useLocation().search}</p>
}

function renderPage(path = '/exam/2') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/exam/:id"
            element={
              <>
                <TakeExamPage />
                <Address />
              </>
            }
          />
          <Route path="/quiz/:id" element={<p>The quiz</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The live count's two numbers, as "20 of 30". */
const liveCount = () => {
  const available = screen.queryByText(/of \d+ available/)
  return available ? `${available.previousSibling!.textContent} ${available.textContent!.replace(' available', '')}` : 'none'
}
const loaded = () => screen.findByRole('heading', { name: 'Associate Developer' })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  getSettings.mockImplementation(async () =>
    json({ userId: 1, quizDefaults: { ...DEFAULT_QUIZ_DEFAULTS, maxQuestions: 20, feedback: 'after_each' }, syntaxHighlighting: true }),
  )
  getPractice.mockImplementation(async () => json(data))
  postQuiz.mockImplementation(async () => json({ id: 9 }, 201))
})

describe('TakeExamPage', () => {
  it('starts on Random and Unanswered, with the tiles greyed and the live count capped', async () => {
    const { container } = renderPage()
    await loaded()
    expect(screen.getByRole('button', { name: /^Random/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: 'Unanswered' })).toBeChecked()
    expect(liveCount()).toBe('20 of 30')
    expect(container.querySelectorAll('[data-question]')).toHaveLength(20)
    expect(screen.getByText(/Pick any tile below/)).toBeInTheDocument()
  })

  it('badges official and unofficial categories, and an exam category with no questions cannot be picked', async () => {
    renderPage()
    await loaded()
    expect(screen.getByRole('button', { name: /^Logic, official/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Odd ones, unofficial/ })).toBeInTheDocument()
    expect(screen.getAllByTitle('Official')).toHaveLength(2)
    expect(screen.getAllByTitle('Unofficial')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /^Empty/ })).toBeDisabled()
  })

  it('counts locally as tiles are picked, from one request, and keeps the selection in the address', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    await user.click(screen.getByRole('button', { name: /^Logic/ }))

    expect(screen.getByRole('button', { name: /^Logic/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Random/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('address')).toHaveTextContent('?categories=1')
    expect(liveCount()).toBe('20 of 25')
    // Alpha is narrowed to its Logic questions.
    expect(screen.getByRole('button', { name: /^Alpha 25 questions/ })).toBeInTheDocument()
    expect(getPractice).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^Random/ }))
    expect(screen.getByTestId('address')).toHaveTextContent(/^$/)
  })

  it('keeps a tile that drops to 0 clickable, greyed, and shows its bar for what the other picks leave', async () => {
    const user = userEvent.setup()
    renderPage('/exam/2?categories=1&sources=7')
    await loaded()
    const two = screen.getByRole('button', { name: /^Alpha two 0 questions/ })
    expect(two).toBeEnabled()
    // Narrowed to Logic, Alpha one has 27 questions, 2 of them attempted.
    expect(screen.getByRole('progressbar', { name: 'Alpha one progress' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('button', { name: /^Alpha one/ }).querySelector('[data-segment="incorrect"]')).toHaveAttribute(
      'title',
      '2 incorrect',
    )
    await user.click(two)
    expect(two).toHaveAttribute('aria-pressed', 'true')
  })

  it('reads the selection from the address, opening a picked source', async () => {
    renderPage('/exam/2?sources=7&chapters=71&status=all')
    await loaded()
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
    expect(screen.getByText(/Only the chapters you've picked/)).toBeInTheDocument()
    expect(liveCount()).toBe('10 of 10')
  })

  it('lets go of the chapters picked inside a source along with it', async () => {
    const user = userEvent.setup()
    renderPage('/exam/2?sources=7')
    await loaded()
    expect(screen.getByText(/All chapters are included/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Alpha two/ }))
    expect(screen.getByTestId('address')).toHaveTextContent('chapters=71')

    await user.click(screen.getByRole('button', { name: /^Alpha 30 questions/ }))
    expect(screen.getByTestId('address')).toHaveTextContent(/^$/)
  })

  it('starts the quiz it counted, with the cap, sort and feedback chosen', async () => {
    const user = userEvent.setup()
    renderPage('/exam/2?categories=1&status=unsolved')
    await loaded()
    expect(liveCount()).toBe('20 of 27')
    await user.click(screen.getByRole('radio', { name: '50' }))
    await user.click(screen.getByRole('radio', { name: 'At the end' }))
    await user.click(screen.getByRole('button', { name: /Start quiz/ }))

    expect(await screen.findByText('The quiz')).toBeInTheDocument()
    expect(postQuiz).toHaveBeenCalledWith({
      json: { examId: 2, feedback: 'at_end', sort: 'random', categoryIds: [1], sourceIds: [], chapterIds: [], status: 'unsolved', limit: 50 },
    })
  })

  it('works from the keyboard: S moves through the statuses, R picks Random and Enter starts', async () => {
    const user = userEvent.setup()
    renderPage('/exam/2?categories=1')
    await loaded()

    await user.keyboard('s')
    expect(screen.getByRole('radio', { name: 'Incorrect' })).toBeChecked()
    await user.keyboard('r')
    expect(screen.getByRole('button', { name: /^Random/ })).toHaveAttribute('aria-pressed', 'true')
    expect(liveCount()).toBe('2 of 2')

    await user.keyboard('{Enter}')
    expect(await screen.findByText('The quiz')).toBeInTheDocument()
    expect(postQuiz.mock.calls[0]![0].json).toMatchObject({ status: 'incorrect', categoryIds: [] })
  })

  it('moves through Max questions with M, then into the number field', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    await user.keyboard('m')
    expect(screen.getByRole('radio', { name: '50' })).toBeChecked()
    await user.keyboard('mm')
    expect(screen.getByRole('radio', { name: 'Max' })).toBeChecked()
    await user.keyboard('m')
    expect(screen.getByLabelText('Custom number of questions')).toHaveFocus()
    // Typing there is typing, not shortcuts.
    await user.keyboard('7m')
    expect(screen.getByLabelText('Custom number of questions')).toHaveValue(7)
  })

  it('makes the part of each bar the status picks stand out', async () => {
    renderPage('/exam/2?status=incorrect')
    await loaded()
    const logic = screen.getByRole('button', { name: /^Logic/ })
    expect(logic.querySelector('[data-segment="incorrect"]')).toHaveAttribute('data-picked')
    expect(logic.querySelector('[data-segment="unanswered"]')).not.toHaveAttribute('data-picked')
  })

  it('gives a soft blue background to the tiles whose questions a pick brings in', async () => {
    renderPage('/exam/2?sources=7&status=all')
    await loaded()
    // Picking the source brings in its categories with questions, and all its chapters.
    expect(screen.getByRole('button', { name: /^Logic/ })).toHaveClass('bg-accent-soft')
    expect(screen.getByRole('button', { name: /^Empty/ })).not.toHaveClass('bg-accent-soft')
    expect(screen.getByRole('button', { name: /^Alpha one/ })).toHaveClass('bg-accent-soft')
  })

  it('stops counting the other chapters in once one is picked', async () => {
    renderPage('/exam/2?sources=7&chapters=71&status=all')
    await loaded()
    expect(screen.getByRole('button', { name: /^Alpha one/ })).not.toHaveClass('bg-accent-soft')
    expect(screen.getByRole('button', { name: /^Alpha two/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('gives sources a soft blue background when only categories are picked', async () => {
    renderPage('/exam/2?categories=1&status=all')
    await loaded()
    expect(screen.getByRole('button', { name: /^Alpha 27 questions/ })).toHaveClass('bg-accent-soft')
    expect(screen.getByRole('button', { name: /^Odd ones/ })).not.toHaveClass('bg-accent-soft')
  })

  it('gives the tiles Random draws from a soft blue background and a plain border', async () => {
    renderPage()
    await loaded()
    const logic = screen.getByRole('button', { name: /^Logic/ })
    expect(logic).toHaveClass('bg-accent-soft')
    expect(logic).not.toHaveClass('border-dotted')
    expect(screen.getByRole('button', { name: /^Empty/ })).not.toHaveClass('bg-accent-soft')
  })

  it('shows a ticked box on picked tiles and an empty one on tiles that could be picked', async () => {
    renderPage('/exam/2?categories=1&status=all')
    await loaded()
    expect(screen.getByRole('button', { name: /^Logic/ }).querySelector('[data-checkbox]')).toHaveAttribute('data-checkbox', 'on')
    expect(screen.getByRole('button', { name: /^Alpha 27 questions/ }).querySelector('[data-checkbox]')).toHaveAttribute(
      'data-checkbox',
      'off',
    )
    // Nothing to add, so no box.
    expect(screen.getByRole('button', { name: /^Empty/ }).querySelector('[data-checkbox]')).toBeNull()
  })

  it('lets you clear the number field and type a new number', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    const box = screen.getByLabelText('Custom number of questions')
    await user.type(box, '2')
    await user.keyboard('{Backspace}')
    expect(box).toHaveValue(null)
    await user.keyboard('5')
    expect(box).toHaveValue(5)
  })

  it('leaves typing alone', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    await user.type(screen.getByLabelText('Custom number of questions'), '5')
    await user.keyboard('{Enter}')
    expect(postQuiz).not.toHaveBeenCalled()
  })

  it('remembers Max questions, Sort and Feedback for each exam, in this browser', async () => {
    const user = userEvent.setup()
    const first = renderPage()
    await loaded()
    await user.click(screen.getByRole('radio', { name: '100' }))
    await user.click(screen.getByRole('radio', { name: 'Source order' }))
    await user.click(screen.getByRole('radio', { name: 'At the end' }))
    first.unmount()

    const again = renderPage()
    await loaded()
    expect(screen.getByRole('radio', { name: '100' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Source order' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'At the end' })).toBeChecked()
    again.unmount()

    // Another exam starts from the saved defaults.
    renderPage('/exam/3')
    await loaded()
    expect(screen.getByRole('radio', { name: '20' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Random' })).toBeChecked()
  })

  it('ignores remembered choices it cannot read', async () => {
    localStorage.setItem('take-exam:2', '{"max":-4,"sort":"sideways"')
    renderPage()
    await loaded()
    expect(screen.getByRole('radio', { name: '20' })).toBeChecked()
  })

  it('sends no cap for Max', async () => {
    const user = userEvent.setup()
    renderPage('/exam/2?status=all')
    await loaded()
    await user.click(screen.getByRole('radio', { name: 'Max' }))
    expect(liveCount()).toBe('37 of 37')
    await user.click(screen.getByRole('button', { name: /Start quiz/ }))
    await screen.findByText('The quiz')
    expect(postQuiz.mock.calls[0]![0].json).not.toHaveProperty('limit')
  })

  it("can't start when nothing matches", async () => {
    renderPage('/exam/2?categories=2&status=incorrect')
    await loaded()
    expect(screen.getByText('No questions match')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start quiz/ })).toBeDisabled()
  })

  it('says so for an exam that does not exist', async () => {
    getPractice.mockImplementation(async () => json({ error: 'No such exam' }, 404))
    renderPage('/exam/99')
    expect(await screen.findByRole('alert')).toHaveTextContent("There's no such exam.")
  })
})

describe('readSelection', () => {
  it('starts on Unanswered, and ignores anything that is not a positive whole number or a known status', () => {
    expect(readSelection(new URLSearchParams('categories=1,x,-2,3&status=whenever'))).toEqual({
      categoryIds: [1, 3],
      sourceIds: [],
      chapterIds: [],
      status: 'unanswered',
    })
  })
})
