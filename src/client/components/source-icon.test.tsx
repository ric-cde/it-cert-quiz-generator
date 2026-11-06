import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ExamCard } from './ExamCard'
import { SourceIcon, SourceIconPicker } from './SourceIcon'
import { SourceTile } from './Tile'

const progress = { correct: 1, incorrect: 1, total: 4 }

describe('SourceIcon', () => {
  it('shows the animal as a picture, hidden from screen readers because the name is beside it', () => {
    const { container } = render(<SourceIcon icon="fox" />)
    const image = container.querySelector('img')!
    expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml,%3Csvg/)
    expect(image).toHaveAttribute('alt', '')
  })

  it.each([null, 'an-animal-since-dropped'])('shows a paw print for %s', (icon) => {
    const { container } = render(<SourceIcon icon={icon} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('SourceIconPicker', () => {
  const choices = ['fox', 'owl', 'polar-bear']

  it('names the icon on its button', () => {
    render(<SourceIconPicker icon="fox" choices={choices} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Source icon: Fox. Choose a different one' })).toBeInTheDocument()
  })

  it('opens to the icons it can have, with the current one marked', async () => {
    const user = userEvent.setup()
    render(<SourceIconPicker icon="owl" choices={choices} onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Fox' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Source icon/ }))
    expect(screen.getAllByRole('button', { name: /^(Fox|Owl|Polar bear)$/ }).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Fox',
      'Owl',
      'Polar bear',
    ])
    expect(screen.getByRole('button', { name: 'Owl' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Fox' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('passes on the one chosen, and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SourceIconPicker icon="fox" choices={choices} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Source icon/ }))
    await user.click(screen.getByRole('button', { name: 'Polar bear' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('polar-bear')
    expect(screen.queryByRole('button', { name: 'Polar bear' })).not.toBeInTheDocument()
  })

  it('says so when it is the only icon left', async () => {
    const user = userEvent.setup()
    render(<SourceIconPicker icon="fox" choices={['fox']} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Source icon/ }))
    expect(screen.getByText(/No other icon is free/)).toBeInTheDocument()
  })

  it('cannot be opened while disabled', async () => {
    const user = userEvent.setup()
    render(<SourceIconPicker icon="fox" choices={choices} onChange={vi.fn()} disabled />)
    await user.click(screen.getByRole('button', { name: /Source icon/ }))
    expect(screen.queryByRole('button', { name: 'Owl' })).not.toBeInTheDocument()
  })
})

describe('where a source icon shows', () => {
  it('on a source tile, beside its name', () => {
    const { container } = render(
      <SourceTile title="Study guide" icon="owl" count={4} progress={progress} chapterCount={2} expanded={false} />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('on a source tile with no icon yet, as a paw print', () => {
    const { container } = render(
      <SourceTile title="Study guide" icon={null} count={4} progress={progress} chapterCount={2} expanded={false} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg.lucide-paw-print')).not.toBeNull()
  })

  it('on a category tile, never', () => {
    // Tiles only get an icon when one is passed, so categories and chapters stay plain.
    const { container } = render(
      <SourceTile title="Study guide" count={4} progress={progress} chapterCount={2} expanded={false} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg.lucide-paw-print')).toBeNull()
  })

  it('beside each source on an exam card', () => {
    const { container } = render(
      <MemoryRouter>
        <ExamCard
          exam={{
            id: 1,
            name: 'An exam',
            status: 'active',
            progress,
            sources: [
              { id: 1, name: 'First', icon: 'fox', progress },
              { id: 2, name: 'Second', icon: 'owl', progress },
            ],
          }}
        />
      </MemoryRouter>,
    )
    const sources = screen.getByRole('list', { name: 'Sources for An exam' })
    expect(sources.querySelectorAll('img')).toHaveLength(2)
    expect(container.querySelectorAll('img')[0]!.getAttribute('src')).not.toBe(container.querySelectorAll('img')[1]!.getAttribute('src'))
    // The name is still the link's text.
    expect(screen.getByRole('link', { name: 'First' })).toBeInTheDocument()
  })
})
