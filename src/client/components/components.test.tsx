import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnswerOption, answerState } from './AnswerOption'
import { Button } from './Button'
import { CodeBlock } from './CodeBlock'
import { LiveCount, MaxQuestionsPicker, parseMaxQuestions, Segmented, Switch } from './Filters'
import { Markdown } from './Markdown'
import { ProgressBar, progressSegments } from './ProgressBar'
import { QuestionCard } from './QuestionCard'
import { RandomTile, SourceTile, Tile } from './Tile'

vi.mock('@/lib/highlight', () => ({
  highlight: vi.fn(async (code: string, language?: string) =>
    language === 'java' ? `<pre class="shiki"><code>highlighted:${code}</code></pre>` : null,
  ),
  resolveLanguage: (language?: string) => (language === 'java' ? 'java' : undefined),
}))

const syntax = vi.hoisted(() => ({ enabled: true, ready: true, toggle: vi.fn() }))
vi.mock('@/lib/settings', () => ({ useSyntaxHighlighting: () => syntax }))

beforeEach(() => {
  Object.assign(syntax, { enabled: true, ready: true })
  syntax.toggle.mockClear()
})

describe('answerState', () => {
  it.each([
    [{ chosen: false, isCorrect: true, locked: false }, 'idle'],
    [{ chosen: true, isCorrect: false, locked: false }, 'selected'],
    [{ chosen: true, isCorrect: true, locked: true }, 'correct-chosen'],
    [{ chosen: false, isCorrect: true, locked: true }, 'correct-missed'],
    [{ chosen: true, isCorrect: false, locked: true }, 'wrong-chosen'],
    [{ chosen: false, isCorrect: false, locked: true }, 'neutral'],
  ] as const)('%o gives %s', (input, expected) => {
    expect(answerState(input)).toBe(expected)
  })
})

describe('AnswerOption', () => {
  it('reports a click while answering', async () => {
    const onToggle = vi.fn()
    render(
      <AnswerOption kind="single" name="q" state="idle" onToggle={onToggle}>
        Option A
      </AnswerOption>,
    )
    await userEvent.click(screen.getByRole('radio', { name: /Option A/ }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('uses a checkbox for multi-answer questions and allows unticking', async () => {
    const onToggle = vi.fn()
    render(
      <AnswerOption kind="multi" name="q" state="selected" onToggle={onToggle}>
        Option A
      </AnswerOption>,
    )
    const box = screen.getByRole('checkbox', { name: /Option A/ })
    expect(box).toBeChecked()
    await userEvent.click(box)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it.each(['correct-chosen', 'correct-missed', 'wrong-chosen', 'neutral'] as const)(
    'cannot be changed once locked as %s',
    async (state) => {
      const onToggle = vi.fn()
      render(
        <AnswerOption kind="single" name="q" state={state} onToggle={onToggle}>
          Option A
        </AnswerOption>,
      )
      const radio = screen.getByRole('radio', { name: /Option A/ })
      expect(radio).toBeDisabled()
      await userEvent.click(radio)
      expect(onToggle).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['correct-chosen', 'Marked correct'],
    ['correct-missed', 'Correct answer'],
    ['wrong-chosen', 'Marked incorrect'],
  ] as const)('says what %s means in words, not only colour', (state, text) => {
    render(
      <AnswerOption kind="single" name="q" state={state}>
        Option A
      </AnswerOption>,
    )
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it.each([
    ['correct-chosen', true],
    ['wrong-chosen', true],
    ['correct-missed', false],
    ['neutral', false],
    ['selected', false],
    ['idle', false],
  ] as const)('%s shows a "Your answer" tag: %s', (state, shown) => {
    render(
      <AnswerOption kind="single" name="q" state={state}>
        Option A
      </AnswerOption>,
    )
    expect(screen.queryAllByText('Your answer')).toHaveLength(shown ? 1 : 0)
  })

  it('shows per-answer text when there is some, and nothing when there is none', () => {
    const { rerender } = render(
      <AnswerOption kind="single" name="q" state="neutral" explanation="Why this is wrong">
        Option A
      </AnswerOption>,
    )
    expect(screen.getByText('Why this is wrong')).toBeInTheDocument()

    rerender(
      <AnswerOption kind="single" name="q" state="neutral">
        Option A
      </AnswerOption>,
    )
    expect(screen.queryByText('Why this is wrong')).not.toBeInTheDocument()
  })

  it('hides the shortcut once locked', () => {
    const { rerender } = render(
      <AnswerOption kind="single" name="q" state="idle" shortcut={3}>
        Option A
      </AnswerOption>,
    )
    expect(screen.getByText('3')).toBeInTheDocument()

    rerender(
      <AnswerOption kind="single" name="q" state="neutral" shortcut={3}>
        Option A
      </AnswerOption>,
    )
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('does not select the answer when its code is copied', async () => {
    const onToggle = vi.fn()
    render(
      <AnswerOption kind="single" name="q" state="idle" onToggle={onToggle}>
        <CodeBlock code="int x;" />
      </AnswerOption>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('does not select the answer when its highlighting is toggled', async () => {
    const onToggle = vi.fn()
    render(
      <AnswerOption kind="single" name="q" state="idle" onToggle={onToggle}>
        <CodeBlock code="int x;" language="java" />
      </AnswerOption>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Syntax highlighting' }))
    expect(syntax.toggle).toHaveBeenCalledOnce()
    expect(onToggle).not.toHaveBeenCalled()
  })
})

describe('QuestionCard', () => {
  it('marks a revealed question, and only then', () => {
    const { container, rerender } = render(<QuestionCard>Question</QuestionCard>)
    expect(container.querySelector('[data-revealed]')).toBeNull()

    rerender(<QuestionCard revealed>Question</QuestionCard>)
    expect(container.querySelector('[data-revealed]')).not.toBeNull()
  })

  it('puts the footer after the question', () => {
    const { container } = render(<QuestionCard footer={<button type="button">Flag</button>}>Question</QuestionCard>)
    const text = container.textContent ?? ''
    expect(text.indexOf('Question')).toBeLessThan(text.indexOf('Flag'))
  })
})

describe('progressSegments', () => {
  it('splits correct and incorrect by total', () => {
    expect(progressSegments({ correct: 25, incorrect: 25, total: 100 })).toEqual({
      correctPct: 25,
      incorrectPct: 25,
      percentComplete: 25,
    })
  })

  it('never rounds up to 100 before everything is correct', () => {
    expect(progressSegments({ correct: 199, incorrect: 1, total: 200 }).percentComplete).toBe(99)
    expect(progressSegments({ correct: 200, incorrect: 0, total: 200 }).percentComplete).toBe(100)
  })

  it('handles an empty bank', () => {
    expect(progressSegments({ correct: 0, incorrect: 0, total: 0 })).toEqual({
      correctPct: 0,
      incorrectPct: 0,
      percentComplete: 0,
    })
  })

  it('never overflows, even with inconsistent counts', () => {
    const { correctPct, incorrectPct } = progressSegments({ correct: 8, incorrect: 8, total: 10 })
    expect(correctPct + incorrectPct).toBe(100)
  })
})

describe('ProgressBar', () => {
  it('exposes the figure to assistive technology', () => {
    render(<ProgressBar label="Concurrency" correct={3} incorrect={1} total={10} />)
    expect(screen.getByRole('progressbar', { name: 'Concurrency' })).toHaveAttribute('aria-valuenow', '30')
    expect(screen.getByText('30%')).toBeInTheDocument()
  })
})

describe('Tile', () => {
  const progress = { correct: 1, incorrect: 1, total: 4 }

  it('reports clicks and shows whether it is selected', async () => {
    const onClick = vi.fn()
    render(<Tile title="OOP" count={4} progress={progress} selected onClick={onClick} />)
    const tile = screen.getByRole('button', { name: /OOP/ })
    expect(tile).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(tile)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('stays clickable while diminished, because clicking turns Random off', async () => {
    const onClick = vi.fn()
    render(<Tile title="OOP" count={4} progress={progress} diminished onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: /OOP/ }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('cannot be selected with no questions', () => {
    render(<Tile title="OOP" count={0} progress={{ correct: 0, incorrect: 0, total: 0 }} />)
    expect(screen.getByRole('button', { name: /OOP/ })).toBeDisabled()
  })

  it('uses the singular for one question', () => {
    render(<Tile title="OOP" count={1} progress={{ correct: 0, incorrect: 0, total: 1 }} />)
    expect(screen.getByText('1 question')).toBeInTheDocument()
  })
})

describe('SourceTile', () => {
  const props = { title: 'Boyarsky', count: 4, progress: { correct: 0, incorrect: 0, total: 4 }, chapterCount: 2 }

  it('selecting and expanding are separate actions', async () => {
    const onClick = vi.fn()
    const onToggleExpanded = vi.fn()
    render(<SourceTile {...props} expanded={false} onClick={onClick} onToggleExpanded={onToggleExpanded} />)

    await userEvent.click(screen.getByRole('button', { name: /2 chapters/ }))
    expect(onToggleExpanded).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /^Boyarsky/ }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows chapters only while expanded', () => {
    const { rerender } = render(
      <SourceTile {...props} expanded={false}>
        <span>Chapter 1</span>
      </SourceTile>,
    )
    expect(screen.queryByText('Chapter 1')).not.toBeInTheDocument()

    rerender(
      <SourceTile {...props} expanded>
        <span>Chapter 1</span>
      </SourceTile>,
    )
    expect(screen.getByText('Chapter 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2 chapters/ })).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('RandomTile', () => {
  it('shows whether it is selected', () => {
    render(<RandomTile selected />)
    expect(screen.getByRole('button', { name: /Random/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('CodeBlock', () => {
  it('shows plain code when the language is not highlighted', async () => {
    render(<CodeBlock code="plain text" language="cobol" />)
    expect(screen.getByText('plain text')).toBeInTheDocument()
  })

  it('swaps in highlighted code once ready', async () => {
    render(<CodeBlock code="int x;" language="java" />)
    expect(await screen.findByText('highlighted:int x;')).toBeInTheDocument()
  })

  it('shows plain code when syntax highlighting is off', async () => {
    syntax.enabled = false
    render(<CodeBlock code="int x;" language="java" />)
    expect(screen.getByText('int x;')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve))
    expect(screen.queryByText('highlighted:int x;')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Syntax highlighting' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the toggle as pressed while highlighting is on', () => {
    render(<CodeBlock code="int x;" language="java" />)
    expect(screen.getByRole('button', { name: 'Syntax highlighting' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has no toggle where it could change nothing', () => {
    render(<CodeBlock code="plain text" />)
    expect(screen.queryByRole('button', { name: 'Syntax highlighting' })).not.toBeInTheDocument()
  })

  it('has no toggle, and plain code, until the setting has loaded', async () => {
    Object.assign(syntax, { enabled: false, ready: false })
    render(<CodeBlock code="int x;" language="java" />)
    expect(screen.queryByRole('button', { name: 'Syntax highlighting' })).not.toBeInTheDocument()
    expect(screen.getByText('int x;')).toBeInTheDocument()
  })

  it('copies the code and confirms', async () => {
    const user = userEvent.setup()
    render(<CodeBlock code="int x;" />)
    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(await navigator.clipboard.readText()).toBe('int x;')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('says so when copying fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
    render(<CodeBlock code="int x;" />)
    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument())
  })
})

describe('Markdown', () => {
  it('renders formatting, GitHub tables and inline code', () => {
    render(<Markdown>{'**bold** and `code`\n\n| A |\n|---|\n| 1 |'}</Markdown>)
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByText('code').tagName).toBe('CODE')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders fenced code with the copy button', () => {
    render(<Markdown>{'```\nint x;\n```'}</Markdown>)
    expect(screen.getByText('int x;')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })

  it('passes the language through to the highlighter', async () => {
    render(<Markdown>{'```java\nint x;\n```'}</Markdown>)
    expect(await screen.findByText('highlighted:int x;')).toBeInTheDocument()
  })

  it('never renders raw HTML from question banks', () => {
    const { container } = render(
      <Markdown>{'Hello <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<b>bold</b>'}</Markdown>,
    )
    expect(container.querySelector('script, img, b')).toBeNull()
  })

  it('removes dangerous links', () => {
    render(<Markdown>{'[click](javascript:alert(1))'}</Markdown>)
    expect(screen.getByText('click').getAttribute('href') ?? '').not.toContain('javascript')
  })

  it('shows a description instead of loading an image', () => {
    const { container } = render(<Markdown>{'![a diagram](https://example.com/x.png)'}</Markdown>)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('[Image: a diagram]')).toBeInTheDocument()
  })
})

describe('Segmented', () => {
  const options = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ] as const

  it('shows the current value and reports changes', async () => {
    const onChange = vi.fn()
    render(<Segmented label="Fruit" value="a" options={options} onChange={onChange} />)
    expect(screen.getByRole('radio', { name: 'Apple' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Banana' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Switch', () => {
  it('toggles from its label', async () => {
    const onChange = vi.fn()
    render(<Switch label="Prioritise" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByText('Prioritise'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('parseMaxQuestions', () => {
  it.each([
    ['35', 35],
    [' 7 ', 7],
    ['0', null],
    ['', null],
    ['-4', null],
    ['2.5', null],
    ['abc', null],
  ])('%j gives %j', (text, expected) => {
    expect(parseMaxQuestions(text)).toBe(expected)
  })
})

describe('MaxQuestionsPicker', () => {
  it('reports presets and Max', async () => {
    const onChange = vi.fn()
    render(<MaxQuestionsPicker value={20} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '50' }))
    expect(onChange).toHaveBeenLastCalledWith(50)
    await userEvent.click(screen.getByRole('radio', { name: 'Max' }))
    expect(onChange).toHaveBeenLastCalledWith('max')
  })

  it('reports a typed number', async () => {
    const onChange = vi.fn()
    render(<MaxQuestionsPicker value={20} onChange={onChange} />)
    await userEvent.type(screen.getByRole('spinbutton'), '5')
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('shows a non-preset value in the number field and no preset as selected', () => {
    render(<MaxQuestionsPicker value={35} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(35)
    expect(screen.getByRole('radio', { name: '20' })).not.toBeChecked()
  })
})

describe('LiveCount', () => {
  it('shows x of y available', () => {
    render(<LiveCount selected={20} available={137} />)
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('of 137 available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start quiz' })).toBeEnabled()
  })

  it('blocks starting when nothing matches', () => {
    render(<LiveCount selected={0} available={0} />)
    expect(screen.getByText('No questions match')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start quiz' })).toBeDisabled()
  })

  it('blocks starting while the count is updating, so it can be trusted', () => {
    render(<LiveCount selected={20} available={137} loading />)
    expect(screen.getByRole('button', { name: 'Start quiz' })).toBeDisabled()
  })
})

describe('Button', () => {
  it('blocks clicks while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Judging
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Judging' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
