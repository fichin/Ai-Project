function createMessage(role, content) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
  }
}

export function createUserMessage(content) {
  return createMessage('user', content)
}

export function createAssistantMessage(content, isError = false) {
  return { ...createMessage('assistant', content), isError }
}

// Maps a persisted message row (from POST /api/chat or
// GET /conversations/:id/messages) to the same shape the optimistic
// createUserMessage/createAssistantMessage helpers above produce, so
// ChatMessage doesn't need to care whether a message is still local-only or
// already saved. Using the real id (instead of a client-generated one) once
// it's known is what lets a future streaming update target this exact
// message.
export function fromServerMessage(row) {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.createdAt }
}
