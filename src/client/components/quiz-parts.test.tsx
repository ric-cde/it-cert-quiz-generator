import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QuizResults } from '@shared/quiz'
import { DifficultyControl } from './DifficultyControl'
import { FlagButton, FlagReason } from './FlagControl'
import { QuizActions } from './QuizActions'
import { MAX_SEGMENTS, QuizProgress } from './QuizProgress'
import { QuizScore, quizScore } from './QuizScore'

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
    expect(quizScore(results({ correct: 2, incorrect: 1, revealed: 1, skipped: 1, notReached: 10 }))).toEqual({
      asked: 5,
      percent: 40,
    })
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

  it('has one segment per question: done, current, then to do', () => {
    const { container } = render(<QuizProgress position={2} total={5} current={2} />)
    const states = [...container.querySelectorAll('[data-segment]')].map((segment) =>
      segment.getAttribute('data-segment'),
    )
    expect(states).toEqual(['done', 'done', 'current', 'todo', 'todo'])
  })

  it('shows how each done question went, and only those', () => {
    const { container } = render(
      <QuizProgress position={4} total={7} current={4} marks={['correct', 'incorrect', 'skipped', 'answered']} />,
    )
    const segments = [...container.querySelectorAll('[data-segment]')]
    expect(segments.map((segment) => segment.getAttribute('data-segment'))).toEqual([
      'correct',
      'incorrect',
      'skipped',
      'answered',
      'current',
      'todo',
      'todo',
    ])
    expect(segments[0]).toHaveClass('bg-correct')
    expect(segments[1]).toHaveClass('bg-wrong')
    expect(segments[2]).toHaveClass('bg-amber')
    expect(segments[3]).toHaveClass('bg-accent')
  })

  it('ignores marks for questions not done yet', () => {
    const { container } = render(<QuizProgress position={1} total={3} current={1} marks={['correct', 'incorrect']} />)
    const states = [...container.querySelectorAll('[data-segment]')].map((segment) =>
      segment.getAttribute('data-segment'),
    )
    expect(states).toEqual(['correct', 'current', 'todo'])
  })

  it('marks no current segment once the question on screen is done', () => {
    const { container } = render(<QuizProgress position={3} total={5} current={2} />)
    expect(container.querySelectorAll('[data-segment="current"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-segment="done"]')).toHaveLength(3)
  })

  it('becomes one line when there would be too many segments', () => {
    const { container } = render(<QuizProgress position={10} total={MAX_SEGMENTS + 1} />)
    expect(container.querySelectorAll('[data-segment]')).toHaveLength(0)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
  })
})

describe('FlagButton', () => {
  const handlers = () => ({ onFlag: vi.fn(), onUnflag: vi.fn() })

  it('flags with one press', async () => {
    const on = handlers()
    render(<FlagButton flagged={false} {...on} />)
    await userEvent.click(screen.getByRole('button', { name: 'Flag' }))
    expect(on.onFlag).toHaveBeenCalledOnce()
  })

  it('unflags with the same button', async () => {
    const on = handlers()
    render(<FlagButton flagged {...on} />)
    await userEvent.click(screen.getByRole('button', { name: 'Unflag' }))
    expect(on.onUnflag).toHaveBeenCalledOnce()
    expect(on.onFlag).not.toHaveBeenCalled()
  })
})

describe('DifficultyControl', () => {
  it('shows the difficulty between a -1 and a +1 button, each moving it a step', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DifficultyControl difficulty={4} onChange={onChange} />)

    expect(screen.getByRole('group', { name: 'Difficulty' })).toHaveTextContent('−1Difficulty 4+1')
    await user.click(screen.getByRole('button', { name: 'Raise difficulty by 1' }))
    await user.click(screen.getByRole('button', { name: 'Lower difficulty by 1' }))
    expect(onChange.mock.calls).toEqual([[1], [-1]])
  })

  it('cannot go below 0 or above 10', () => {
    const { rerender } = render(<DifficultyControl difficulty={0} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Lower difficulty by 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Raise difficulty by 1' })).toBeEnabled()

    rerender(<DifficultyControl difficulty={10} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Lower difficulty by 1' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Raise difficulty by 1' })).toBeDisabled()
  })

  it('holds both buttons while a step is being saved', () => {
    render(<DifficultyControl difficulty={5} busy onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Lower difficulty by 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Raise difficulty by 1' })).toBeDisabled()
  })
})

describe('FlagReason', () => {
  it('saves a changed reason only', async () => {
    const on = { onSaveReason: vi.fn() }
    render(<FlagReason reason="Old" {...on} />)
    const user = userEvent.setup()

    expect(screen.getByLabelText(/What's wrong with it/)).toHaveValue('Old')
    expect(screen.getByRole('button', { name: 'Save reason' })).toBeDisabled()

    await user.type(screen.getByLabelText(/What's wrong with it/), ' news ')
    await user.click(screen.getByRole('button', { name: 'Save reason' }))
    expect(on.onSaveReason).toHaveBeenCalledWith('Old news')
  })
})

describe('QuizActions', () => {
  it('keeps a hidden place for Next that no one can reach', () => {
    render(<QuizActions tools={<button type="button">Flag</button>}>Left</QuizActions>)
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flag' })).toBeInTheDocument()
  })

  it("shows what goes in Next's place", () => {
    render(<QuizActions end={<button type="button">Skip</button>}>Left</QuizActions>)
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })
})
