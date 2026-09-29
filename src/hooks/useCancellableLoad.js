import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '../lib/apiClient'

// Wraps the "load once on mount, retry on demand, cancel the in-flight
// request on unmount or when a newer call supersedes it" lifecycle that
// Projects.jsx and Agents.jsx both hand-rolled identically (isLoading/error
// state, an AbortController ref, abort-then-replace on retry, skip setting
// error state for a cancellation, don't clobber a newer request's loading
// state). What actually gets fetched — and how many things, and which state
// setters receive the result — stays entirely up to the caller's `loadFn`,
// so this hook has no opinion on shape (Projects fetches one list; Agents
// fetches two in parallel via Promise.all and sets two states).
//
// `loadFn` receives the current AbortController's signal and may return a
// promise; throwing (or rejecting) sets `error` unless the rejection is an
// abort, in which case it's silently ignored — cancellation is never
// surfaced to the user.
export function useCancellableLoad(loadFn) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)
  // Keeps `load` callable from a `[]`-deps effect/useCallback without ever
  // running a stale closure over `loadFn` — same pattern as
  // useDismissableLayer's onDismissRef.
  const loadFnRef = useRef(loadFn)

  useEffect(() => {
    loadFnRef.current = loadFn
  })

  const load = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setIsLoading(true)
    setError(null)

    // Calling `loadFnRef.current` here (rather than inside a `.then`) keeps
    // it synchronous, matching how the original hand-rolled `loadProjects`/
    // `loadAll` functions called `fetchProjects`/`fetchAgents` immediately.
    // The try/catch converts a synchronous throw into a rejection too, so
    // the chain below handles both the same way.
    let pending
    try {
      pending = loadFnRef.current(controller.signal)
    } catch (err) {
      pending = Promise.reject(err)
    }

    return Promise.resolve(pending)
      .catch((err) => {
        if (isAbortError(err)) return
        setError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    // The setState calls happen inside `load`, not synchronously in the
    // effect body itself — same pattern as AuthProvider's restoreSession().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => controllerRef.current?.abort()
  }, [load])

  return { isLoading, error, retry: load }
}
