import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeleteConfirmation } from './useDeleteConfirmation'

const item = { id: 1, name: 'Research Agent' }

describe('useDeleteConfirmation', () => {
  it('request() sets the pending item and clears any previous error', () => {
    const { result } = renderHook(() => useDeleteConfirmation(vi.fn(), vi.fn()))

    act(() => result.current.request(item))

    expect(result.current.pendingItem).toEqual(item)
    expect(result.current.error).toBeNull()
  })

  it('cancel() clears the pending item', () => {
    const { result } = renderHook(() => useDeleteConfirmation(vi.fn(), vi.fn()))

    act(() => result.current.request(item))
    act(() => result.current.cancel())

    expect(result.current.pendingItem).toBeNull()
  })

  it('cancel() is a no-op while a delete is in flight', async () => {
    let resolveDelete
    const deleteFn = vi.fn(() => new Promise((res) => (resolveDelete = res)))
    const { result } = renderHook(() => useDeleteConfirmation(deleteFn, vi.fn()))

    act(() => result.current.request(item))
    act(() => {
      result.current.confirm()
    })
    expect(result.current.isDeleting).toBe(true)

    act(() => result.current.cancel())
    expect(result.current.pendingItem).toEqual(item)

    await act(async () => resolveDelete())
  })

  it('confirm() calls deleteFn then onDeleted with the pending item, and clears it on success', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const onDeleted = vi.fn()
    const { result } = renderHook(() => useDeleteConfirmation(deleteFn, onDeleted))

    act(() => result.current.request(item))
    await act(async () => result.current.confirm())

    expect(deleteFn).toHaveBeenCalledWith(item)
    expect(onDeleted).toHaveBeenCalledWith(item)
    expect(result.current.pendingItem).toBeNull()
    expect(result.current.isDeleting).toBe(false)
  })

  it('confirm() sets an error and keeps the pending item when the delete request fails', async () => {
    const deleteFn = vi.fn().mockRejectedValue(new Error('Delete failed'))
    const onDeleted = vi.fn()
    const { result } = renderHook(() => useDeleteConfirmation(deleteFn, onDeleted))

    act(() => result.current.request(item))
    await act(async () => result.current.confirm())

    expect(result.current.error).toBe('Delete failed')
    expect(result.current.pendingItem).toEqual(item)
    expect(result.current.isDeleting).toBe(false)
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
