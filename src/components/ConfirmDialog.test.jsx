import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

function renderDialog(props = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      title="Delete agent"
      message='Are you sure you want to delete "Research Agent"? This cannot be undone.'
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Delete agent' })).toBeInTheDocument()
    expect(
      screen.getByText('Are you sure you want to delete "Research Agent"? This cannot be undone.'),
    ).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const { onConfirm } = renderDialog({ confirmLabel: 'Delete' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const { onCancel } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when Escape is pressed (handled by the underlying Modal)', () => {
    const { onCancel } = renderDialog()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows an error message when provided', () => {
    renderDialog({ error: 'Something went wrong.' })

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })

  it('disables both buttons and shows a submitting label while isSubmitting', () => {
    renderDialog({ isSubmitting: true, confirmLabel: 'Delete' })

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
  })

  it('uses default labels when none are provided', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })
})
