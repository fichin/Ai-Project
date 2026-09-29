import { useState } from 'react'

// Wraps the "reset error, mark submitting, run the request, report or clear
// the error, always stop submitting" lifecycle that every form in the app
// (Project/Agent forms, Login, Register, ForgotPassword, ResetPassword)
// hand-rolled identically around its own async submit call. Field-level
// validation stays outside this hook (run it before calling `submit`) since
// it's synchronous and entirely form-specific.
//
// `submit(action, { onError } = {})` runs `action()`; on failure it calls
// `onError(err)` if given (so a form like Login can branch on a specific
// error shape, e.g. an unverified-email code), otherwise it falls back to
// setting `error` to `err.message`.
export function useSubmitState() {
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(action, { onError } = {}) {
    setError(null)
    setIsSubmitting(true)
    try {
      await action()
    } catch (err) {
      if (onError) {
        onError(err)
      } else {
        setError(err.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return { error, setError, isSubmitting, submit }
}
