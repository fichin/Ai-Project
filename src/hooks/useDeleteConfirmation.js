import { useState } from 'react'

// Wraps the "click delete -> confirm dialog -> call the delete request ->
// remove it from the list" flow that Projects.jsx and Agents.jsx both
// hand-rolled identically (pending item, isDeleting, delete error, and the
// request/cancel/confirm handlers driving a ConfirmDialog). `deleteFn(item)`
// performs the actual delete request; `onDeleted(item)` updates whatever
// local list state needs the item removed — this hook owns only the
// confirm-dialog's own state, not the list itself.
export function useDeleteConfirmation(deleteFn, onDeleted) {
  const [pendingItem, setPendingItem] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  function request(item) {
    setError(null)
    setPendingItem(item)
  }

  function cancel() {
    if (isDeleting) return
    setPendingItem(null)
    setError(null)
  }

  async function confirm() {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteFn(pendingItem)
      onDeleted(pendingItem)
      setPendingItem(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return { pendingItem, isDeleting, error, request, cancel, confirm }
}
