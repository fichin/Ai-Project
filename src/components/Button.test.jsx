import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Button from './Button'

describe('Button', () => {
  it('renders a native button by default with the primary variant class', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('btn', 'btn-primary')
  })

  it('applies the requested variant class', () => {
    render(<Button variant="danger">Delete</Button>)

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger')
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Go</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} disabled>
        Go
      </Button>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders a router Link when `to` is provided', () => {
    render(
      <MemoryRouter>
        <Button to="/dashboard">Open dashboard</Button>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Open dashboard' })
    expect(link).toHaveAttribute('href', '/dashboard')
    expect(link).toHaveClass('btn', 'btn-primary')
  })

  it('renders a plain anchor when `href` is provided', () => {
    render(<Button href="https://example.com">External</Button>)

    expect(screen.getByRole('link', { name: 'External' })).toHaveAttribute('href', 'https://example.com')
  })
})
