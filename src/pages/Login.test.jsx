import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { useAuth } from '../context/useAuth'
import { usePreferences } from '../context/usePreferences'
import { fetchPreferences } from '../components/preferences/preferencesApi'

vi.mock('../context/useAuth')
vi.mock('../context/usePreferences')
vi.mock('../components/preferences/preferencesApi')

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

describe('Login — show/hide password toggle', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, isLoading: false, login: vi.fn() })
    usePreferences.mockReturnValue({ preferences: null })
  })

  it('hides the password by default and reveals it as plain text when toggled', () => {
    renderLogin()
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'whatever' } })

    expect(screen.getByLabelText(/Password/)).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('type', 'password')
  })
})

describe('Login — error messaging', () => {
  it('shows the server message for invalid credentials rather than a generic message', async () => {
    const error = new Error('Invalid email or password.')
    const login = vi.fn().mockRejectedValue(error)
    useAuth.mockReturnValue({ user: null, isLoading: false, login })
    usePreferences.mockReturnValue({ preferences: null })

    renderLogin()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
    expect(fetchPreferences).not.toHaveBeenCalled()
  })
})
