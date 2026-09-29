import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, fireEvent } from '@testing-library/react'
import { useDismissableLayer } from './useDismissableLayer'

describe('useDismissableLayer — Escape key', () => {
  it('calls onDismiss when Escape is pressed while open', () => {
    const onDismiss = vi.fn()
    renderHook(() => useDismissableLayer({ onDismiss }))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape when isOpen is false', () => {
    const onDismiss = vi.fn()
    renderHook(() => useDismissableLayer({ isOpen: false, onDismiss }))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('ignores keys other than Escape', () => {
    const onDismiss = vi.fn()
    renderHook(() => useDismissableLayer({ onDismiss }))

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe('useDismissableLayer — click outside', () => {
  function ContainerHarness({ onDismiss }) {
    const containerRef = useRef(null)
    useDismissableLayer({ onDismiss, containerRef })

    return (
      <div>
        <div ref={containerRef}>
          <button>Inside</button>
        </div>
        <button>Outside</button>
      </div>
    )
  }

  it('calls onDismiss when a click lands outside the container', () => {
    const onDismiss = vi.fn()
    render(<ContainerHarness onDismiss={onDismiss} />)

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not call onDismiss when a click lands inside the container', () => {
    const onDismiss = vi.fn()
    render(<ContainerHarness onDismiss={onDismiss} />)

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Inside' }))

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does not attach an outside-click listener when no containerRef is given (no crash)', () => {
    const onDismiss = vi.fn()
    renderHook(() => useDismissableLayer({ onDismiss }))

    expect(() => fireEvent.mouseDown(document.body)).not.toThrow()
    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe('useDismissableLayer — focus trap and restore (dialogRef)', () => {
  function DialogHarness({ isOpen, onDismiss }) {
    const dialogRef = useRef(null)
    useDismissableLayer({ isOpen, onDismiss, dialogRef })
    if (!isOpen) return null

    return (
      <div ref={dialogRef}>
        <button>First</button>
        <button>Last</button>
      </div>
    )
  }

  it('moves initial focus to the first focusable element when nothing inside has focus', () => {
    render(<DialogHarness isOpen onDismiss={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('does not steal focus from an element that already has it (e.g. an autoFocus field)', () => {
    function AutoFocusDialog() {
      const dialogRef = useRef(null)
      useDismissableLayer({ isOpen: true, onDismiss: vi.fn(), dialogRef })
      return (
        <div ref={dialogRef}>
          <input autoFocus placeholder="Name" />
          <button>Save</button>
        </div>
      )
    }

    render(<AutoFocusDialog />)

    expect(screen.getByPlaceholderText('Name')).toHaveFocus()
  })

  it('wraps Tab from the last focusable element back to the first', () => {
    render(<DialogHarness isOpen onDismiss={vi.fn()} />)

    screen.getByRole('button', { name: 'Last' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('wraps Shift+Tab from the first focusable element back to the last', () => {
    render(<DialogHarness isOpen onDismiss={vi.fn()} />)

    screen.getByRole('button', { name: 'First' }).focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('restores focus to the trigger element once the dialog closes', () => {
    function App() {
      const [isOpen, setIsOpen] = useState(false)
      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Open</button>
          <DialogHarness isOpen={isOpen} onDismiss={() => setIsOpen(false)} />
        </div>
      )
    }

    render(<App />)

    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    fireEvent.click(openButton)

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(openButton).toHaveFocus()
  })
})
