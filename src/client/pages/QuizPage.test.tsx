import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { QuizQuestion, QuizState } from '../../shared/quiz'
import { QuizPage } from './QuizPage'

vi.mock('@/lib/highlight', () => ({ highlight: vi.fn(async () => null), resolveLanguage: (language?: string) => language }))
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
      questions: { ':id': { flag: { $put: vi.fn(), $delete: vi.fn() } } },
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

const json = (value: unknown, status = 200) => Response.json(value, { status }) as never

const question = (overrides: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: 10,
  type: 'single',
  bodyMd: 'What is the question?',
  source: 'A source',
  options: [
    { id: 1, bodyMd: 'First' },
    { id: 2, bodyMd: 'Second' },
    { id: 3, bodyMd: 'Third' },
  ],
  flag: null,
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
  finished: false,
  current: question(),
  results: null,
  ...overrides,
})

const lockedOptions = [
  { id: 1, bodyMd: 'First', isCorrect: true, explanationMd: 'Why first is right' },
  { id: 2, bodyMd: 'Second', isCorrect: false, explanationMd: 'Why second is wrong' },
  { id: 3, bodyMd: 'Third', isCorrect: false, explanationMd: null },
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
  quiz({ position: 1, current: question({ id: 11, bodyMd: 'The next question?', options: [{ id: 4, bodyMd: 'Fourth' }] }) })

const finished = quiz({
  finished: true,
  current: null,
  results: { correct: 2, incorrect: 1, revealed: 0, skipped: 0, notReached: 0 },
})

function renderQuiz(state: QuizState = quiz()) {
  getQuiz.mockImplementation(async () => json(state))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/quiz/5']}>
        <Routes>
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>
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
      expect(postAnswer).toHaveBeenCalledWith(expect.objectContaining({ json: expect.objectContaining({ selectedOptionIds: [3] }) }))
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
      expect(postAnswer).toHaveBeenCalledWith(expect.objectContaining({ json: expect.objectContaining({ selectedOptionIds: [3] }) }))
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
        json(quiz({ current: question({ options: lockedOptions, outcome: { result: 'incorrect', kind: 'revealed', selectedOptionIds: [] } }) })),
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

      await user.click(await screen.findByRole('button', { name: 'Move on without answering' }))

      expect(await screen.findByText('The next question?')).toBeInTheDocument()
    })

    it('offers no such way out of an unflagged question', async () => {
      renderQuiz()
      await screen.findByText('What is the question?')
      expect(screen.queryByRole('button', { name: /Move on/ })).not.toBeInTheDocument()
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

      await user.click(await screen.findByRole('button', { name: 'End quiz' }))
      expect(postFinish).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Keep going' }))

      expect(postFinish).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'End quiz' })).toBeInTheDocument()
    })

    it('ends early and shows the score', async () => {
      postFinish.mockImplementation(async () => json(finished))
      renderQuiz()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'End quiz' }))
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
      expect(screen.getByRole('link', { name: 'attempts' })).toHaveAttribute('href', '/dev/data/attempts')
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
