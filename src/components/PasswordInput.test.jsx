import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PasswordInput from './PasswordInput'

describe('PasswordInput', () => {
  it('renders as a password field by default, hiding the value', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />)
    expect(screen.getByDisplayValue('secret')).toHaveAttribute('type', 'password')
  })

  it('reveals the value as plain text when the toggle is clicked, and hides it again on a second click', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByDisplayValue('secret')).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByDisplayValue('secret')).toHaveAttribute('type', 'password')
  })

  it('forwards onChange, required, autoComplete and other input props', () => {
    const handleChange = vi.fn()
    render(
      <PasswordInput value="" onChange={handleChange} required autoComplete="new-password" minLength={8} />,
    )

    const input = screen.getByDisplayValue('')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('autocomplete', 'new-password')
    expect(input).toHaveAttribute('minlength', '8')

    fireEvent.change(input, { target: { value: 'a' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('does not submit the enclosing form when the toggle is clicked', () => {
    const handleSubmit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={handleSubmit}>
        <PasswordInput value="secret" onChange={() => {}} />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
