import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { FeatureOverride } from '@/lib/features'
import type { FeatureFlags } from '@shared/features'
import type { QuizQuestion, QuizState } from '@shared/quiz'
import { QuizPage } from './QuizPage'

vi.mock('@/lib/highlight', () => ({
  highlight: vi.fn(async () => null),
  resolveLanguage: (language?: string) => language,
}))
vi.mock('@/lib/settings', () => ({
  useSyntaxHighlighting: () => ({ enabled: false, ready: true, toggle: () => {} }),
}))
vi.mock('@/lib/api', () => ({
  api: {
    api: {
      quizzes: {
        ':id': {
          $get: vi.fn(),
          answer: { $post: vi.fn() },
          reveal: { $post: vi.fn() },
          next: { $post: vi.fn() },
          finish: { $post: vi.fn() },
        },
      },
      questions: {
        ':id': {
          flag: { $put: vi.fn(), $delete: vi.fn() },
          star: { $put: vi.fn(), $delete: vi.fn() },
          difficulty: { $post: vi.fn() },
        },
      },
    },
  },
}))

const routes = api.api.quizzes[':id']
const getQuiz = vi.mocked(routes.$get)
const postAnswer = vi.mocked(routes.answer.$post)
const postReveal = vi.mocked(routes.reveal.$post)
const postNext = vi.mocked(routes.next.$post)
const postFinish = vi.mocked(routes.finish.$post)
const putFlag = vi.mocked(api.api.questions[':id'].flag.$put)
const deleteFlag = vi.mocked(api.api.questions[':id'].flag.$delete)
const putStar = vi.mocked(api.api.questions[':id'].star.$put)
const deleteStar = vi.mocked(api.api.questions[':id'].star.$delete)
const postDifficulty = vi.mocked(api.api.questions[':id'].difficulty.$post)

const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

const question = (overrides: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: 10,
  type: 'single',
  bodyMd: 'What is the question?',
  source: 'A source',
  options: [
    { id: 1, label: null, bodyMd: 'First' },
    { id: 2, label: null, bodyMd: 'Second' },
    { id: 3, label: null, bodyMd: 'Third' },
  ],
  flag: null,
  starred: false,
  inDoubt: false,
  outcome: null,
  ...overrides,
})

const quiz = (overrides: Partial<QuizState> = {}): QuizState => ({
  id: 5,
  exam: 'An exam',
  feedback: 'after_each',
  total: 3,
  position: 0,
  marks: [],
  finished: false,
  current: question(),
  results: null,
  summary: null,
  ...overrides,
})

const lockedOptions = [
  { id: 1, label: null, bodyMd: 'First', isCorrect: true, explanationMd: 'Why first is right' },
  { id: 2, label: null, bodyMd: 'Second', isCorrect: false, explanationMd: 'Why second is wrong' },
  { id: 3, label: null, bodyMd: 'Third', isCorrect: false, explanationMd: null },
]

const answered = (selected: number[], result: 'correct' | 'incorrect', overrides: Partial<QuizQuestion> = {}) =>
  quiz({
    current: question({
      options: lockedOptions,
      category: 'Logic',
      outcome: { result, kind: 'answered', selectedOptionIds: selected },
      ...overrides,
    }),
  })

const nextQuiz = () =>
  quiz({
    position: 1,
    current: question({ id: 11, bodyMd: 'The next question?', options: [{ id: 4, label: null, bodyMd: 'Fourth' }] }),
  })

const finished = quiz({
  finished: true,
  current: null,
  results: { correct: 2, incorrect: 1, revealed: 0, skipped: 0, notReached: 0 },
  summary: { byCategory: [{ name: 'Logic', correct: 2, asked: 3 }], missed: 1, examId: 2, label: 'Random' },
})

function renderQuiz(state: QuizState = quiz(), flags: Partial<FeatureFlags> = {}) {
  getQuiz.mockImplementation(async () => json(state))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <FeatureOverride flags={flags}>
        <MemoryRouter initialEntries={['/quiz/5']}>
          <Routes>
            <Route path="/quiz/:id" element={<QuizPage />} />
            <Route path="/" element={<p>Home page</p>} />
          </Routes>
        </MemoryRouter>
      </FeatureOverride>
    </QueryClientProvider>,
  )
}

const optionLabel = (text: string) => screen.getByText(text).closest('[data-state]')!

beforeEach(() => {
  vi.clearAllMocks()
})

describe('QuizPage', () => {
  describe('feedback after each question', () => {
    it('shows the question with Submit disabled until something is chosen', async () => {
      renderQuiz()

      expect(await screen.findByText('What is the question?')).toBeInTheDocument()
      expect(screen.getByText(/Question 1 of 3 · A source/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Submit/ })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Reveal answer/ })).toBeEnabled()

      const user = userEvent.setup()
      await user.click(screen.getByRole('radio', { name: /First/ }))
      expect(screen.getByRole('button', { name: /^Submit/ })).toBeEnabled()
    })

    it('submits, then shows the marks, text, your answer and the category', async () => {
      postAnswer.mockImplementation(async () => json(answered([2], 'incorrect')))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('radio', { name: /Second/ }))
      await user.click(screen.getByRole('button', { name: /^Submit/ }))

      expect(await screen.findByText('Incorrect')).toBeInTheDocument()
      expect(postAnswer).toHaveBeenCalledWith({
        param: { id: '5' },
        json: { questionId: 10, selectedOptionIds: [2], durationMs: expect.any(Number) },
      })
      expect(optionLabel('Second')).toHaveAttribute('data-state', 'wrong-chosen')
      expect(optionLabel('First')).toHaveAttribute('data-state', 'correct-missed')
      expect(optionLabel('Third')).toHaveAttribute('data-state', 'neutral')
      expect(screen.getByText('Why first is right')).toBeInTheDocument()
      expect(screen.getByText('Why second is wrong')).toBeInTheDocument()
      expect(within(optionLabel('Second') as HTMLElement).getByText('Your answer')).toBeInTheDocument()
      expect(screen.getByText(/· Logic/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Submit/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Reveal/ })).not.toBeInTheDocument()
    })

    it("shows the source's letters on the options, matching the explanation that refers to them", async () => {
      const lettered = lockedOptions.map((option, index) => ({
        ...option,
        label: 'ABC'[index]!,
        explanationMd: null,
      }))
      renderQuiz(answered([2], 'incorrect', { options: lettered, explanationMd: 'A. Option B is wrong because...' }))
      expect(await screen.findByText('A. Option B is wrong because...')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /^B\.\s*Second/ })).toBeInTheDocument()
    })

    it('shows the explanation of the whole question once marked', async () => {
      renderQuiz(answered([1], 'correct', { explanationMd: 'About the whole question.' }))
      expect(await screen.findByText('About the whole question.')).toBeInTheDocument()
      expect(screen.queryByText(/No explanation/)).not.toBeInTheDocument()
    })

    it('says once, quietly, when a missed question has no explanation anywhere', async () => {
      const bare = lockedOptions.map((option) => ({ ...option, explanationMd: null }))
      renderQuiz(answered([2], 'incorrect', { options: bare, explanationMd: null }))
      expect(await screen.findByText('No explanation in this source yet.')).toBeInTheDocument()
    })

    it('says nothing about missing text when the answer was right', async () => {
      const bare = lockedOptions.map((option) => ({ ...option, explanationMd: null }))
      renderQuiz(answered([1], 'correct', { options: bare, explanationMd: null }))
      await screen.findByText('Correct')
      expect(screen.queryByText(/No explanation/)).not.toBeInTheDocument()
    })

    it('shows only the text that exists, when some options have none', async () => {
      renderQuiz(answered([2], 'incorrect'))
      expect(await screen.findByText('Why second is wrong')).toBeInTheDocument()
      expect(screen.queryByText(/No explanation/)).not.toBeInTheDocument()
    })

    it('reveals, marking the whole card, with nothing shown as your answer', async () => {
      postReveal.mockImplementation(async () =>
        json(
          quiz({
            current: question({
              options: lockedOptions.map((o) => (o.isCorrect ? o : { ...o, explanationMd: null })),
              outcome: { result: 'incorrect', kind: 'revealed', selectedOptionIds: [] },
            }),
          }),
        ),
      )
      const { container } = renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: /Reveal answer/ }))

      expect(await screen.findByText('Revealed')).toBeInTheDocument()
      expect(container.querySelector('[data-revealed]')).not.toBeNull()
      expect(screen.getByText('Why first is right')).toBeInTheDocument()
      expect(screen.queryByText('Your answer')).not.toBeInTheDocument()
    })

    it('moves on with Next, starting the next question clean', async () => {
      postNext.mockImplementation(async () => json(nextQuiz()))
      renderQuiz(answered([1], 'correct'))
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: /^Next/ }))

      expect(await screen.findByText('The next question?')).toBeInTheDocument()
      expect(postNext).toHaveBeenCalledWith({ param: { id: '5' }, json: { questionId: 10 } })
      expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Submit/ })).toBeDisabled()
    })

    it('resumes on a locked question, with its marks', async () => {
      renderQuiz(answered([1], 'correct'))

      expect(await screen.findByText('Correct')).toBeInTheDocument()
      expect(optionLabel('First')).toHaveAttribute('data-state', 'correct-chosen')
      expect(screen.getByRole('button', { name: /^Next/ })).toBeInTheDocument()
    })

    it('lets a multi-answer question tick several, with no limit', async () => {
      renderQuiz(quiz({ current: question({ type: 'multi' }) }))
      const user = userEvent.setup()
      await user.click(await screen.findByRole('checkbox', { name: /First/ }))
      await user.click(screen.getByRole('checkbox', { name: /Second/ }))
      await user.click(screen.getByRole('checkbox', { name: /Third/ }))
      expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(3)

      await user.click(screen.getByRole('checkbox', { name: /Second/ }))
      expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2)
    })

    it('lets a single-answer question hold only one', async () => {
      renderQuiz()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('radio', { name: /First/ }))
      await user.click(screen.getByRole('radio', { name: /Second/ }))
      expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
    })
  })

  describe('feedback at the end', () => {
    const atEnd = () => quiz({ feedback: 'at_end' })

    it('has no Submit or Reveal, only Next', async () => {
      renderQuiz(atEnd())
      expect(await screen.findByRole('button', { name: /^Next/ })).toBeEnabled()
      expect(screen.queryByRole('button', { name: /^Submit/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Reveal/ })).not.toBeInTheDocument()
    })

    it('saves the answer and moves on with no verdict', async () => {
      postAnswer.mockImplementation(async () => json({ ...nextQuiz(), feedback: 'at_end' }))
      renderQuiz(atEnd())
      const user = userEvent.setup()

      await user.click(await screen.findByRole('radio', { name: /Third/ }))
      await user.click(screen.getByRole('button', { name: /^Next/ }))

      expect(await screen.findByText('The next question?')).toBeInTheDocument()
      expect(postAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ json: expect.objectContaining({ selectedOptionIds: [3] }) }),
      )
      expect(postNext).not.toHaveBeenCalled()
      expect(screen.queryByText(/Correct|Incorrect/)).not.toBeInTheDocument()
    })

    it('says when Next will skip, until something is selected', async () => {
      renderQuiz(atEnd())
      const user = userEvent.setup()

      expect(await screen.findByText(/Next skips this one/)).toBeInTheDocument()
      await user.click(screen.getByRole('radio', { name: /First/ }))
      expect(screen.queryByText(/Next skips this one/)).not.toBeInTheDocument()
    })

    it('skips with Next when nothing is selected', async () => {
      postNext.mockImplementation(async () => json({ ...nextQuiz(), feedback: 'at_end' }))
      renderQuiz(atEnd())
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: /^Next/ }))

      expect(await screen.findByText('The next question?')).toBeInTheDocument()
      expect(postAnswer).not.toHaveBeenCalled()
    })
  })

  describe('keyboard', () => {
    it('selects with number keys, in the order shown, and submits with Enter', async () => {
      postAnswer.mockImplementation(async () => json(answered([3], 'incorrect')))
      renderQuiz()
      const user = userEvent.setup()
      await screen.findByText('What is the question?')

      await user.keyboard('3')
      expect(screen.getByRole('radio', { name: /Third/ })).toBeChecked()
      await user.keyboard('1')
      expect(screen.getByRole('radio', { name: /First/ })).toBeChecked()
      await user.keyboard('3{Enter}')

      expect(await screen.findByText('Incorrect')).toBeInTheDocument()
      expect(postAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ json: expect.objectContaining({ selectedOptionIds: [3] }) }),
      )
    })

    it('toggles with number keys on a multi-answer question', async () => {
      renderQuiz(quiz({ current: question({ type: 'multi' }) }))
      const user = userEvent.setup()
      await screen.findByText('What is the question?')

      await user.keyboard('12')
      expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2)
      await user.keyboard('1')
      expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(1)
    })

    it('ignores a number with no option, and Enter with nothing chosen', async () => {
      renderQuiz()
      const user = userEvent.setup()
      await screen.findByText('What is the question?')

      await user.keyboard('7{Enter}')

      expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
      expect(postAnswer).not.toHaveBeenCalled()
      expect(postNext).not.toHaveBeenCalled()
    })

    it('reveals with R, but leaves the browser its own Ctrl+R', async () => {
      postReveal.mockImplementation(async () =>
        json(
          quiz({
            current: question({
              options: lockedOptions,
              outcome: { result: 'incorrect', kind: 'revealed', selectedOptionIds: [] },
            }),
          }),
        ),
      )
      renderQuiz()
      const user = userEvent.setup()
      await screen.findByText('What is the question?')

      await user.keyboard('{Control>}r{/Control}')
      expect(postReveal).not.toHaveBeenCalled()

      await user.keyboard('r')
      expect(await screen.findByText('Revealed')).toBeInTheDocument()
    })

    it('moves on with Enter once locked, and no longer changes the answer with numbers', async () => {
      postNext.mockImplementation(async () => json(nextQuiz()))
      renderQuiz(answered([1], 'correct'))
      const user = userEvent.setup()
      await screen.findByText('Correct')

      await user.keyboard('2')
      expect(optionLabel('First')).toHaveAttribute('data-state', 'correct-chosen')
      expect(optionLabel('Second')).toHaveAttribute('data-state', 'neutral')

      await user.keyboard('{Enter}')
      expect(await screen.findByText('The next question?')).toBeInTheDocument()
      expect(postNext).toHaveBeenCalledTimes(1)
    })

    it('has no reveal key at the end, and Enter moves on', async () => {
      postNext.mockImplementation(async () => json({ ...nextQuiz(), feedback: 'at_end' }))
      renderQuiz(quiz({ feedback: 'at_end' }))
      const user = userEvent.setup()
      await screen.findByText('What is the question?')

      await user.keyboard('r')
      expect(postReveal).not.toHaveBeenCalled()

      await user.keyboard('{Enter}')
      expect(await screen.findByText('The next question?')).toBeInTheDocument()
    })

    it('stays out of the way while typing a flag reason', async () => {
      renderQuiz(quiz({ current: question({ flag: { reason: null } }) }))
      const user = userEvent.setup()

      await user.type(await screen.findByLabelText(/What's wrong with it/), 'r1')

      expect(screen.getByLabelText(/What's wrong with it/)).toHaveValue('r1')
      expect(postReveal).not.toHaveBeenCalled()
      expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    })

    it('lets Enter press a focused button only once', async () => {
      postNext.mockImplementation(async () => json(nextQuiz()))
      renderQuiz(answered([1], 'correct'))
      const user = userEvent.setup()

      ;(await screen.findByRole('button', { name: /^Next/ })).focus()
      await user.keyboard('{Enter}')

      await screen.findByText('The next question?')
      expect(postNext).toHaveBeenCalledTimes(1)
    })

    it('puts focus at the top of each new question', async () => {
      postNext.mockImplementation(async () => json(nextQuiz()))
      renderQuiz(answered([1], 'correct'))
      const user = userEvent.setup()
      await screen.findByText('Correct')

      await user.keyboard('{Enter}')
      await screen.findByText('The next question?')

      expect(document.activeElement).toHaveTextContent(/Question 2 of 3/)
    })
  })

  describe('starring', () => {
    const star = () => screen.findByRole('button', { name: 'Star this question' })

    it('shows an unfilled star with no word, and fills it with one press', async () => {
      putStar.mockImplementation(async () => json({ ok: true }))
      renderQuiz()
      const user = userEvent.setup()

      const button = await star()
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toHaveTextContent('')
      expect(button.querySelector('svg')).not.toHaveClass('fill-current')

      await user.click(button)
      expect(putStar).toHaveBeenCalledWith({ param: { id: '10' } })
      await vi.waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      expect(button.querySelector('svg')).toHaveClass('fill-current')
      // The question isn't loaded again, so an answer being chosen is left alone.
      expect(getQuiz).toHaveBeenCalledTimes(1)
    })

    it('takes the star off with the same button', async () => {
      deleteStar.mockImplementation(async () => json({ ok: true }))
      renderQuiz(quiz({ current: question({ starred: true }) }))
      const user = userEvent.setup()

      const button = await star()
      expect(button).toHaveAttribute('aria-pressed', 'true')
      await user.click(button)
      expect(deleteStar).toHaveBeenCalledWith({ param: { id: '10' } })
      await vi.waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))
    })

    it('goes back, and says so, when the star cannot be saved', async () => {
      putStar.mockImplementation(async () => json({ error: 'No such question' }, 404))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await star())
      expect(await screen.findByText(/Couldn't save that star/)).toBeInTheDocument()
      expect(await star()).toHaveAttribute('aria-pressed', 'false')
    })

    it('is left out when Settings turns starring off', async () => {
      renderQuiz(quiz(), { starredQuestions: false })
      expect(await screen.findByRole('button', { name: 'Flag' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Star this question' })).not.toBeInTheDocument()
    })
  })

  describe('difficulty buttons', () => {
    const control = () => screen.findByRole('group', { name: 'Difficulty' })

    it('shows the difficulty once locked, and moves it a step with each button', async () => {
      postDifficulty.mockImplementation(async () => json({ difficulty: 6 }))
      renderQuiz(answered([2], 'incorrect', { difficulty: 5 }))
      const user = userEvent.setup()

      const group = await control()
      expect(group).toHaveTextContent('Difficulty 5')
      await user.click(within(group).getByRole('button', { name: 'Raise difficulty by 1' }))
      expect(postDifficulty).toHaveBeenCalledWith({ param: { id: '10' }, json: { change: 1 } })
      await vi.waitFor(() => expect(group).toHaveTextContent('Difficulty 6'))

      postDifficulty.mockImplementation(async () => json({ difficulty: 5 }))
      await user.click(within(group).getByRole('button', { name: 'Lower difficulty by 1' }))
      expect(postDifficulty).toHaveBeenLastCalledWith({ param: { id: '10' }, json: { change: -1 } })
      await vi.waitFor(() => expect(group).toHaveTextContent('Difficulty 5'))
      // The question isn't loaded again.
      expect(getQuiz).toHaveBeenCalledTimes(1)
    })

    it('sits before Star and Flag', async () => {
      renderQuiz(answered([1], 'correct', { difficulty: 3 }))
      const group = await control()
      const star = screen.getByRole('button', { name: 'Star this question' })
      expect(group.compareDocumentPosition(star) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('moves with the up and down arrow keys', async () => {
      postDifficulty.mockImplementation(async () => json({ difficulty: 4 }))
      renderQuiz(answered([1], 'correct', { difficulty: 3 }))
      const user = userEvent.setup()
      const group = await control()

      await user.keyboard('{ArrowUp}')
      expect(postDifficulty).toHaveBeenCalledWith({ param: { id: '10' }, json: { change: 1 } })
      await vi.waitFor(() => expect(group).toHaveTextContent('Difficulty 4'))

      postDifficulty.mockImplementation(async () => json({ difficulty: 3 }))
      await user.keyboard('{ArrowDown}')
      expect(postDifficulty).toHaveBeenLastCalledWith({ param: { id: '10' }, json: { change: -1 } })
      await vi.waitFor(() => expect(group).toHaveTextContent('Difficulty 3'))
    })

    it('stops at 0 and at 10, for the buttons and the keys', async () => {
      const user = userEvent.setup()
      const { unmount } = renderQuiz(answered([1], 'correct', { difficulty: 0 }))
      expect(within(await control()).getByRole('button', { name: 'Lower difficulty by 1' })).toBeDisabled()
      await user.keyboard('{ArrowDown}')
      unmount()

      renderQuiz(answered([2], 'incorrect', { difficulty: 10 }))
      expect(within(await control()).getByRole('button', { name: 'Raise difficulty by 1' })).toBeDisabled()
      await user.keyboard('{ArrowUp}')
      expect(postDifficulty).not.toHaveBeenCalled()
    })

    it('is not there before answering, so the arrow keys do nothing', async () => {
      renderQuiz()
      const user = userEvent.setup()
      await screen.findByText('What is the question?')
      await user.keyboard('{ArrowUp}{ArrowDown}')
      expect(screen.queryByRole('group', { name: 'Difficulty' })).not.toBeInTheDocument()
      expect(postDifficulty).not.toHaveBeenCalled()
    })

    it('is not there with feedback at the end', async () => {
      renderQuiz(quiz({ feedback: 'at_end' }))
      await screen.findByText('What is the question?')
      expect(screen.queryByRole('group', { name: 'Difficulty' })).not.toBeInTheDocument()
    })

    it('says so, and keeps the old figure, when a step cannot be saved', async () => {
      postDifficulty.mockImplementation(async () => json({ error: 'nope' }, 500))
      renderQuiz(answered([1], 'correct', { difficulty: 3 }))
      const user = userEvent.setup()
      const group = await control()

      await user.keyboard('{ArrowUp}')
      expect(await screen.findByText(/Couldn't change the difficulty/)).toBeInTheDocument()
      expect(group).toHaveTextContent('Difficulty 3')
    })

    it('is left out, keys and all, when Settings turns it off', async () => {
      renderQuiz(answered([1], 'correct', { difficulty: 3 }), { difficultyButtons: false })
      const user = userEvent.setup()
      await screen.findByText('Correct')
      await user.keyboard('{ArrowUp}')
      expect(screen.queryByRole('group', { name: 'Difficulty' })).not.toBeInTheDocument()
      expect(postDifficulty).not.toHaveBeenCalled()
    })
  })

  describe('flagging', () => {
    it('flags with one press', async () => {
      putFlag.mockImplementation(async () => json({ ok: true }))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Flag' }))
      expect(putFlag).toHaveBeenCalledWith({ param: { id: '10' }, json: {} })
    })

    it('saves a reason, and undoes a flag', async () => {
      putFlag.mockImplementation(async () => json({ ok: true }))
      deleteFlag.mockImplementation(async () => json({ ok: true }))
      renderQuiz(quiz({ current: question({ flag: { reason: null } }) }))
      const user = userEvent.setup()

      expect(screen.queryByRole('button', { name: 'Save reason' })).not.toBeInTheDocument()
      await user.type(await screen.findByLabelText(/What's wrong with it/), 'Broken{Enter}')
      expect(putFlag).toHaveBeenCalledWith({ param: { id: '10' }, json: { reason: 'Broken' } })

      await user.click(screen.getByRole('button', { name: 'Unflag' }))
      expect(deleteFlag).toHaveBeenCalledWith({ param: { id: '10' } })
    })

    it('lets you leave a flagged question unanswered', async () => {
      postNext.mockImplementation(async () => json(nextQuiz()))
      renderQuiz(quiz({ current: question({ flag: { reason: null } }) }))
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Skip' }))

      expect(await screen.findByText('The next question?')).toBeInTheDocument()
    })

    it('offers no such way out of an unflagged question', async () => {
      renderQuiz()
      await screen.findByText('What is the question?')
      expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument()
    })
  })

  describe('a doubtful question', () => {
    it('warns before answering, without giving the note away', async () => {
      renderQuiz(quiz({ current: question({ inDoubt: true }) }))
      expect(await screen.findByText(/marked answer to this question is in doubt/)).toBeInTheDocument()
    })

    it('shows the note after answering', async () => {
      renderQuiz(answered([1], 'correct', { inDoubt: true, reviewNote: 'The source looks wrong.' }))
      expect(await screen.findByText(/The source looks wrong\./)).toBeInTheDocument()
    })

    it('shows no warning on an ordinary question', async () => {
      renderQuiz()
      await screen.findByText('What is the question?')
      expect(screen.queryByText(/in doubt/)).not.toBeInTheDocument()
    })
  })

  describe('ending', () => {
    it('asks once, and can back out', async () => {
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Exit' }))
      expect(postFinish).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Keep going' }))

      expect(postFinish).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Exit' })).toBeInTheDocument()
    })

    it('ends early and shows the score', async () => {
      postFinish.mockImplementation(async () => json(finished))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Exit' }))
      await user.click(screen.getByRole('button', { name: 'Yes, end it' }))

      expect(await screen.findByRole('heading', { name: 'Quiz finished' })).toBeInTheDocument()
      expect(screen.getByText(/2 of 3 correct/)).toBeInTheDocument()
    })

    it('shows the results when the last Next finishes it', async () => {
      postNext.mockImplementation(async () => json(finished))
      renderQuiz(answered([1], 'correct'))
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: /^Next/ }))

      expect(await screen.findByRole('heading', { name: 'Quiz finished' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Retry missed \(1\)/ })).toBeInTheDocument()
    })
  })

  describe('when something goes wrong', () => {
    it('keeps your selection and says so if saving fails', async () => {
      postAnswer.mockImplementationOnce(async () => json({}, 500))
      postAnswer.mockImplementationOnce(async () => json(answered([2], 'incorrect')))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('radio', { name: /Second/ }))
      await user.click(screen.getByRole('button', { name: /^Submit/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't save that/)
      expect(screen.getByRole('radio', { name: /Second/ })).toBeChecked()

      await user.click(screen.getByRole('button', { name: /^Submit/ }))
      expect(await screen.findByText('Incorrect')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('reloads quietly when out of date, such as from another tab', async () => {
      postAnswer.mockImplementation(async () => json({ error: 'conflict' }, 409))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('radio', { name: /Second/ }))
      getQuiz.mockImplementation(async () => json(nextQuiz()))
      await user.click(screen.getByRole('button', { name: /^Submit/ }))

      expect(await screen.findByText('The next question?')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('says when there is no such quiz', async () => {
      getQuiz.mockImplementation(async () => json({}, 404))
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/quiz/404']}>
            <Routes>
              <Route path="/quiz/:id" element={<QuizPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      expect(await screen.findByRole('alert')).toHaveTextContent("There's no such quiz.")
    })
  })
})

describe('copying the question', () => {
  it('copies just the question and options before answering, including any picked so far', async () => {
    renderQuiz()
    const user = userEvent.setup()
    await user.click(await screen.findByText('Second'))
    await user.click(screen.getByRole('button', { name: 'Copy question' }))

    expect(await navigator.clipboard.readText()).toBe(
      'What is the question?\n\n(Choose one.)\n\n- First\n- Second\n- Third\n',
    )
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('adds the tags, the verdict and the explanations once answered', async () => {
    renderQuiz(answered([2], 'incorrect', { explanationMd: 'First, because.' }))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Copy question' }))

    expect(await navigator.clipboard.readText()).toBe(
      [
        'What is the question?',
        '',
        '(Choose one.)',
        '',
        '- First [Missed answer, correct]',
        '   Why first is right',
        '- Second [Your answer, wrong]',
        '   Why second is wrong',
        '- Third',
        '',
        'Result: Incorrect',
        '',
        'Explanation:',
        'First, because.',
        '',
      ].join('\n'),
    )
  })

  it('leaves out the answer while a quiz marked at the end is still going', async () => {
    renderQuiz(quiz({ feedback: 'at_end' }))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Copy question' }))
    expect(await navigator.clipboard.readText()).not.toContain('[')
  })
})

describe('the top of the quiz', () => {
  it('has Exit beside the exam name, which asks before ending the quiz', async () => {
    renderQuiz()
    const user = userEvent.setup()
    expect(await screen.findByRole('heading', { name: 'An exam' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Exit' }))
    expect(screen.getByText(/End it now\?/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End quiz' })).not.toBeInTheDocument()
  })
})
