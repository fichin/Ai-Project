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
