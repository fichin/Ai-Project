import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TypingIndicator from './TypingIndicator'

describe('TypingIndicator', () => {
  it('exposes a status with readable text for screen readers', () => {
    render(<TypingIndicator />)

    expect(screen.getByRole('status')).toHaveTextContent('Assistant is typing…')
  })

  it('hides the decorative dots from assistive tech', () => {
    const { container } = render(<TypingIndicator />)

    const dots = container.querySelectorAll('.typing-dot')
    expect(dots).toHaveLength(3)
    dots.forEach((dot) => expect(dot).toHaveAttribute('aria-hidden', 'true'))
  })
})
