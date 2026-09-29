import { useEffect, useState } from 'react'

// Returns `value`, but only after it's stopped changing for `delayMs` —
// standard debounce-by-value. Used to delay recomputing a filter (or firing
// a request) while the user is still typing, without touching the input's
// own state (callers keep a separate, immediately-updated value for the
// controlled <input> itself so typing stays responsive).
export function useDebounce(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
