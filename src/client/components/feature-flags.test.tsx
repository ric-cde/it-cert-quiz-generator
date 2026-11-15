import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeatureOverride } from '@/lib/features'
import { ExamIcon } from './ExamIcon'
import { Kbd } from './Kbd'
import { SourceIcon } from './SourceIcon'

describe('components that follow a feature flag', () => {
  it('shows keycaps unless shortcut hints are off', () => {
    const { rerender } = render(<Kbd>Enter</Kbd>)
    expect(screen.getByText('Enter')).toBeInTheDocument()
    rerender(
      <FeatureOverride flags={{ shortcutHints: false }}>
        <Kbd>Enter</Kbd>
      </FeatureOverride>,
    )
    expect(screen.queryByText('Enter')).not.toBeInTheDocument()
  })

  it('shows source icons unless they are off', () => {
    const { container, rerender } = render(<SourceIcon icon="fox" />)
    expect(container.querySelector('img')).not.toBeNull()
    rerender(
      <FeatureOverride flags={{ sourceIcons: false }}>
        <SourceIcon icon="fox" />
      </FeatureOverride>,
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows exam icons unless they are off', () => {
    const { container, rerender } = render(<ExamIcon subject="Java" />)
    expect(container.querySelector('img')).not.toBeNull()
    rerender(
      <FeatureOverride flags={{ examIcons: false }}>
        <ExamIcon subject="Java" />
        <ExamIcon subject="Nothing that has a logo" />
      </FeatureOverride>,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })
})
