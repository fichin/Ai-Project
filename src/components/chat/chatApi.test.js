import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../lib/apiClient'
import { deleteConversation } from './chatApi'

vi.mock('../../lib/apiClient')

describe('deleteConversation', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('sends DELETE to the conversation\'s own endpoint', async () => {
    apiRequest.mockResolvedValueOnce(null)

    await expect(deleteConversation(42)).resolves.toBeNull()

    expect(apiRequest).toHaveBeenCalledWith('/api/conversations/42', { method: 'DELETE' })
  })

  it('rejects with the API error so callers can surface it', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Conversation not found.'))

    await expect(deleteConversation(42)).rejects.toThrow('Conversation not found.')
  })
})
