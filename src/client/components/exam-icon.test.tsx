import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ExamCard } from './ExamCard'
import { ExamIcon } from './ExamIcon'

const progress = { correct: 1, incorrect: 1, total: 4 }
const logo = (container: HTMLElement) => container.querySelector('img[data-exam-icon]')

describe('ExamIcon', () => {
  it("shows the subject's logo as a picture, hidden from screen readers because the name is beside it", () => {
    const { container } = render(<ExamIcon subject="OutSystems" name="Associate Developer (O11)" />)
    const image = logo(container)!
    expect(image).toHaveAttribute('data-exam-icon', 'outsystems')
    expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml,%3Csvg/)
    expect(image).toHaveAttribute('alt', '')
  })

  it('shows a rosette when nothing matches', () => {
    const { container } = render(<ExamIcon subject="Project management" name="PRINCE2 Foundation" />)
    expect(logo(container)).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('an exam card', () => {
  const card = (subject: string, name: string) =>
    render(
      <MemoryRouter>
        <ExamCard exam={{ id: 1, name, subject, status: 'active', progress, sources: [] }} />
      </MemoryRouter>,
    )

  it("has its subject's logo, the same for every exam in the subject", () => {
    const first = card('OutSystems', 'Associate Developer (O11)')
    expect(logo(first.container)).toHaveAttribute('data-exam-icon', 'outsystems')
    first.unmount()
    const second = card('OutSystems', 'Java integration specialist')
    expect(logo(second.container)).toHaveAttribute('data-exam-icon', 'outsystems')
    // The heading is still just the exam's name.
    expect(screen.getByRole('heading', { name: 'Java integration specialist' })).toBeInTheDocument()
  })
})
