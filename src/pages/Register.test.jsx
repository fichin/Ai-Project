import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from './Register'
import { useAuth } from '../context/useAuth'
import { usePreferences } from '../context/usePreferences'

vi.mock('../context/useAuth')
vi.mock('../context/usePreferences')

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

function fillForm({ name = 'Ada Lovelace', email = 'ada@example.com', password = 'Abcdefg1', confirmPassword }) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: confirmPassword ?? password },
  })
}

describe('Register — password strength validation', () => {
  let register

  beforeEach(() => {
    register = vi.fn()
    useAuth.mockReturnValue({ user: null, isLoading: false, register })
    usePreferences.mockReturnValue({ preferences: null })
  })

  it('blocks submission and explains a too-short password', () => {
    renderRegister()
    fillForm({ password: 'Ab1', confirmPassword: 'Ab1' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('blocks submission and explains a missing uppercase letter', () => {
    renderRegister()
    fillForm({ password: 'abcdefg1', confirmPassword: 'abcdefg1' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Password must include at least one uppercase letter.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('blocks submission and explains a missing number', () => {
    renderRegister()
    fillForm({ password: 'Abcdefgh', confirmPassword: 'Abcdefgh' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Password must include at least one number.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('blocks submission and explains a confirm-password mismatch', () => {
    renderRegister()
    fillForm({ password: 'Abcdefg1', confirmPassword: 'Abcdefg2' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('submits when the password meets every requirement and both fields match', async () => {
    register.mockResolvedValue({ email: 'ada@example.com' })
    renderRegister()
    fillForm({ password: 'Abcdefg1' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    await screen.findByText('Check your email')
    expect(register).toHaveBeenCalledWith('ada@example.com', 'Abcdefg1', 'Ada Lovelace')
  })
})

describe('Register — duplicate email handling', () => {
  beforeEach(() => {
    usePreferences.mockReturnValue({ preferences: null })
  })

  it('shows a clear "already registered" message when the backend returns 409', async () => {
    const error = new Error('An account with this email already exists.')
    error.status = 409
    const register = vi.fn().mockRejectedValue(error)
    useAuth.mockReturnValue({ user: null, isLoading: false, register })

    renderRegister()
    fillForm({ password: 'Abcdefg1' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('This email is already registered.')).toBeInTheDocument()
  })

  it('falls back to the server message for a non-409 registration failure', async () => {
    const error = new Error('Something went wrong on our end.')
    error.status = 500
    const register = vi.fn().mockRejectedValue(error)
    useAuth.mockReturnValue({ user: null, isLoading: false, register })

    renderRegister()
    fillForm({ password: 'Abcdefg1' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Something went wrong on our end.')).toBeInTheDocument()
  })
})

describe('Register — show/hide password toggle', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, isLoading: false, register: vi.fn() })
    usePreferences.mockReturnValue({ preferences: null })
  })

  it('toggles the password field independently from the confirm-password field', () => {
    renderRegister()
    fillForm({ password: 'Abcdefg1' })

    const [passwordToggle, confirmToggle] = screen.getAllByRole('button', { name: 'Show password' })
    fireEvent.click(passwordToggle)

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password')
    expect(confirmToggle).toBeInTheDocument()
  })
})
