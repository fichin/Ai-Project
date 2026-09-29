import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
}

// Centralizes the "close this layer" behavior that Modal, ActivityDrawer,
// NotificationsBell and NavAccountMenu each used to hand-roll slightly
// differently:
//
//  - Escape-to-close: always active while `isOpen`.
//  - Click-outside-to-close: only when a `containerRef` is given — that's
//    the anchored-popover shape (NotificationsBell/NavAccountMenu). Full
//    -screen overlay dialogs (Modal/ActivityDrawer) already get this for
//    free from their own overlay's onClick and should NOT pass a
//    containerRef, or the dismiss would fire twice for the same click.
//  - Focus trap + focus restore: only when a `dialogRef` is given — that's
//    reserved for real modal/drawer overlays, not lightweight popovers.
//    Moves focus into the dialog if nothing inside it already has focus
//    (so it plays nicely with a field's own `autoFocus`), keeps Tab from
//    leaving the dialog while it's open, and restores focus to whatever
//    triggered the dialog once it closes.
//
// CommandPalette intentionally does NOT use this hook: its Escape handling
// is fused into the same onKeyDown that drives arrow-key list navigation,
// and it manages its own search-input focus on open. Splitting that apart
// would add risk without removing any real duplication.
export function useDismissableLayer({ isOpen = true, onDismiss, containerRef, dialogRef } = {}) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') onDismissRef.current?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !containerRef) return

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onDismissRef.current?.()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen, containerRef])

  useEffect(() => {
    if (!isOpen || !dialogRef) return

    const previouslyFocused = document.activeElement
    const container = dialogRef.current

    if (container && !container.contains(document.activeElement)) {
      getFocusableElements(container)[0]?.focus()
    }

    function handleKeyDown(event) {
      if (event.key !== 'Tab') return

      const node = dialogRef.current
      if (!node) return

      const focusable = getFocusableElements(node)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (
        previouslyFocused &&
        previouslyFocused !== document.body &&
        document.contains(previouslyFocused) &&
        typeof previouslyFocused.focus === 'function'
      ) {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, dialogRef])
}

export default useDismissableLayer
