import { apiRequest } from '../../lib/apiClient'

// `options` is optional and forwarded as-is to apiRequest/fetch — pass
// `{ signal }` from an AbortController to make the request cancellable;
// every existing call site that omits it is unaffected.
export function fetchConversations(options) {
  return apiRequest('/api/conversations', options)
}

export function createConversationRequest(title) {
  return apiRequest('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title ? { title } : {}),
  })
}

export function fetchConversationMessages(conversationId, options) {
  return apiRequest(`/api/conversations/${conversationId}/messages`, options)
}

export function sendChatMessage(conversationId, message) {
  return apiRequest('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message }),
  })
}
