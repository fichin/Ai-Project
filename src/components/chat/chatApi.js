import { apiRequest } from '../../lib/apiClient'

export function fetchConversations() {
  return apiRequest('/api/conversations')
}

export function createConversationRequest(title) {
  return apiRequest('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title ? { title } : {}),
  })
}

export function fetchConversationMessages(conversationId) {
  return apiRequest(`/api/conversations/${conversationId}/messages`)
}

export function sendChatMessage(conversationId, message) {
  return apiRequest('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message }),
  })
}
