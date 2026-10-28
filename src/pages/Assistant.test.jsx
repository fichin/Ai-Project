import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Assistant from './Assistant'
import {
  fetchConversations,
  createConversationRequest,
  deleteConversation,
  fetchConversationMessages,
  fetchChatStatus,
  sendChatMessage,
} from '../components/chat/chatApi'
import { useAuth } from '../context/useAuth'

vi.mock('../components/chat/chatApi')
vi.mock('../context/useAuth')

// jsdom doesn't implement scrollIntoView — Assistant's own
// scroll-to-bottom effect calls it on every messages/isTyping change, so
// every test needs this stubbed the same way real browsers provide it.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const conversation = { id: 1, title: 'First chat' }
const conversation2 = { id: 2, title: 'Second chat' }
const userMsg = { id: 100, role: 'user', content: 'Hello', createdAt: '2026-01-01' }
const assistantMsg = { id: 101, role: 'assistant', content: 'Hi there', createdAt: '2026-01-01' }

// Mimics real fetch: resolves/rejects like a plain promise, but also rejects
// with an AbortError the instant its signal is aborted — exactly what
// TanStack Query does when it cancels an in-flight queryFn (e.g. on
// unmount).
function deferredRequest() {
  let resolve
  const inner = new Promise((res) => {
    resolve = res
  })
  const wrapped = (...args) => {
    const options = args[args.length - 1]
    return new Promise((res, rej) => {
      options?.signal?.addEventListener('abort', () => {
        const error = new Error('The operation was aborted.')
        error.name = 'AbortError'
        rej(error)
      })
      inner.then(res)
    })
  }
  return { resolve, wrapped }
}

function renderAssistant() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <Assistant />
    </QueryClientProvider>,
  )
}

function resetAllMocks() {
  fetchConversations.mockReset()
  createConversationRequest.mockReset()
  fetchConversationMessages.mockReset()
  sendChatMessage.mockReset()
  deleteConversation.mockReset()
  fetchChatStatus.mockReset()
  fetchChatStatus.mockResolvedValue({ simulated: false })
}

describe('Assistant — conversations query', () => {
  beforeEach(() => {
    resetAllMocks()
    useAuth.mockReturnValue({ user: { name: 'Ada', avatarId: 'robot' } })
  })

  it('shows a loading state, auto-selects the first conversation, and loads its messages', async () => {
    fetchConversations.mockResolvedValueOnce([conversation])
    fetchConversationMessages.mockResolvedValueOnce([userMsg, assistantMsg])

    renderAssistant()

    expect(screen.getByText('Loading conversations...')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())
    expect(fetchConversationMessages).toHaveBeenCalledWith(conversation.id, expect.anything())
    // "First chat" now appears both in the sidebar item and the topbar
    // title — getAllByText since the point is just "it rendered".
    expect(screen.getAllByText('First chat').length).toBeGreaterThan(0)
  })

  it('shows the empty state when there are no conversations, without fetching messages', async () => {
    fetchConversations.mockResolvedValueOnce([])

    renderAssistant()

    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())
    expect(fetchConversationMessages).not.toHaveBeenCalled()
  })

  it('shows an error with a Retry button on failure, and auto-selects once the retry succeeds', async () => {
    fetchConversations.mockRejectedValueOnce(new Error('Network down'))
    renderAssistant()
    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument())
    expect(fetchConversations).toHaveBeenCalledTimes(1)

    fetchConversations.mockResolvedValueOnce([conversation])
    fetchConversationMessages.mockResolvedValueOnce([])
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    // "First chat" (in the sidebar) can render before the auto-select
    // effect has run, so wait for the actual proof of auto-select — the
    // messages fetch it triggers — rather than the list rendering alone.
    await waitFor(() =>
      expect(fetchConversationMessages).toHaveBeenCalledWith(conversation.id, expect.anything()),
    )
  })

  it('passes an AbortSignal to fetchConversations that aborts on unmount', async () => {
    const request = deferredRequest()
    fetchConversations.mockImplementation((...args) => request.wrapped(...args))

    const { unmount } = renderAssistant()

    expect(fetchConversations).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }))
    const { signal } = fetchConversations.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })
})

describe('Assistant — messages query', () => {
  beforeEach(() => {
    resetAllMocks()
    useAuth.mockReturnValue({ user: { name: 'Ada', avatarId: 'robot' } })
    fetchConversations.mockResolvedValue([conversation, conversation2])
  })

  it('passes an AbortSignal to fetchConversationMessages that aborts on unmount', async () => {
    const request = deferredRequest()
    fetchConversationMessages.mockImplementation((...args) => request.wrapped(...args))

    const { unmount } = renderAssistant()

    await waitFor(() => expect(fetchConversationMessages).toHaveBeenCalled())
    const options = fetchConversationMessages.mock.calls[0][1]
    expect(options.signal.aborted).toBe(false)

    unmount()

    expect(options.signal.aborted).toBe(true)
  })

  it('shows an error with a Retry button when the messages fetch fails', async () => {
    fetchConversationMessages.mockRejectedValueOnce(new Error('Could not load messages.'))

    renderAssistant()

    await waitFor(() => expect(screen.getByText('Could not load messages.')).toBeInTheDocument())

    fetchConversationMessages.mockResolvedValueOnce([userMsg])
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())
  })

  it('loads the newly selected conversation\'s own messages when switching, scoped per conversation', async () => {
    fetchConversationMessages.mockImplementation((conversationId) =>
      Promise.resolve(conversationId === conversation.id ? [userMsg] : [assistantMsg]),
    )

    renderAssistant()
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation list' }))
    fireEvent.click(screen.getByRole('button', { name: 'Second chat' }))

    await waitFor(() => expect(screen.getByText('Hi there')).toBeInTheDocument())
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })
})

describe('Assistant — sending messages', () => {
  beforeEach(() => {
    resetAllMocks()
    useAuth.mockReturnValue({ user: { name: 'Ada', avatarId: 'robot' } })
    fetchConversations.mockResolvedValue([conversation])
    fetchConversationMessages.mockResolvedValue([])
  })

  it('echoes the message optimistically, then replaces it with the server response', async () => {
    renderAssistant()
    // TanStack Query's very first render (before its mount effect starts a
    // fetch) can transiently look identical to "loaded and empty" for both
    // queries at once, which a text-only wait can race past. Waiting for
    // the actual messages fetch call proves the conversation has really
    // been auto-selected, not just that the empty state briefly rendered.
    await waitFor(() =>
      expect(fetchConversationMessages).toHaveBeenCalledWith(conversation.id, expect.anything()),
    )
    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())

    let resolveSend
    sendChatMessage.mockImplementation(
      () =>
        new Promise((res) => {
          resolveSend = res
        }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Explain what this platform can do/ }))

    await waitFor(() =>
      expect(screen.getByText('Explain what this platform can do')).toBeInTheDocument(),
    )

    resolveSend({ userMessage: userMsg, assistantMessage: assistantMsg, conversationId: conversation.id })

    await waitFor(() => expect(screen.getByText('Hi there')).toBeInTheDocument())
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.queryByText('Explain what this platform can do')).not.toBeInTheDocument()
  })

  it('keeps the optimistic message and appends an error message when sending fails', async () => {
    renderAssistant()
    await waitFor(() =>
      expect(fetchConversationMessages).toHaveBeenCalledWith(conversation.id, expect.anything()),
    )
    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())

    sendChatMessage.mockRejectedValueOnce(new Error('Could not reach the assistant.'))

    fireEvent.click(screen.getByRole('button', { name: /Debug an error in my code/ }))

    await waitFor(() => expect(screen.getByText('Could not reach the assistant.')).toBeInTheDocument())
    expect(screen.getByText('Debug an error in my code')).toBeInTheDocument()
  })

  it('creates a real conversation and switches to it when sending with none selected', async () => {
    fetchConversations.mockReset()
    fetchConversations.mockResolvedValue([])
    renderAssistant()
    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())

    sendChatMessage.mockResolvedValueOnce({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversationId: 55,
    })
    fetchConversations.mockResolvedValueOnce([{ id: 55, title: 'Landing Page Ideas' }])

    fireEvent.click(screen.getByRole('button', { name: /Give me ideas for a landing page/ }))

    await waitFor(() => expect(screen.getByText('Hi there')).toBeInTheDocument())
    expect(sendChatMessage).toHaveBeenCalledWith(null, 'Give me ideas for a landing page')
    // "Landing Page Ideas" now appears both in the sidebar item and the
    // topbar title.
    await waitFor(() => expect(screen.getAllByText('Landing Page Ideas').length).toBeGreaterThan(0))
  })
})

describe('Assistant — new chat', () => {
  beforeEach(() => {
    resetAllMocks()
    useAuth.mockReturnValue({ user: { name: 'Ada', avatarId: 'robot' } })
    fetchConversations.mockResolvedValue([conversation])
  })

  it('reuses the current conversation instead of creating one when it is already empty', async () => {
    fetchConversationMessages.mockResolvedValue([])
    renderAssistant()
    await waitFor(() =>
      expect(fetchConversationMessages).toHaveBeenCalledWith(conversation.id, expect.anything()),
    )
    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation list' }))
    fireEvent.click(screen.getByRole('button', { name: /New chat/ }))

    expect(createConversationRequest).not.toHaveBeenCalled()
  })

  it('creates a new conversation and switches to it when the current one has messages', async () => {
    fetchConversationMessages.mockResolvedValue([userMsg])
    renderAssistant()
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

    const created = { id: 99, title: 'Fresh Conversation' }
    createConversationRequest.mockResolvedValueOnce(created)
    fetchConversationMessages.mockResolvedValueOnce([])

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation list' }))
    fireEvent.click(screen.getByRole('button', { name: /New chat/ }))

    // "Fresh Conversation" now appears both in the sidebar item and the
    // topbar title.
    await waitFor(() => expect(screen.getAllByText('Fresh Conversation').length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())
  })

  it('shows a create-conversation failure in the conversations error slot, cleared by Retry', async () => {
    fetchConversationMessages.mockResolvedValue([userMsg])
    renderAssistant()
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

    createConversationRequest.mockRejectedValueOnce(new Error('Could not create conversation.'))

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation list' }))
    fireEvent.click(screen.getByRole('button', { name: /New chat/ }))

    await waitFor(() => expect(screen.getByText('Could not create conversation.')).toBeInTheDocument())

    fetchConversations.mockResolvedValueOnce([conversation])
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() =>
      expect(screen.queryByText('Could not create conversation.')).not.toBeInTheDocument(),
    )
  })
})

describe('Assistant — deleting conversations', () => {
  beforeEach(() => {
    resetAllMocks()
    useAuth.mockReturnValue({ user: { name: 'Ada', avatarId: 'robot' } })
    fetchConversations.mockResolvedValue([conversation, conversation2])
    fetchConversationMessages.mockImplementation((conversationId) =>
      Promise.resolve(conversationId === conversation.id ? [userMsg] : [assistantMsg]),
    )
  })

  // conversation (id 1) is auto-selected on load, showing its "Hello".
  async function renderWithFirstConversationActive() {
    renderAssistant()
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())
  }

  it('asks for confirmation, then removes a non-active conversation from the list without a reload', async () => {
    await renderWithFirstConversationActive()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Second chat' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Are you sure you want to delete "Second chat"?')

    deleteConversation.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deleteConversation).toHaveBeenCalledWith(conversation2.id)
    expect(screen.queryByRole('button', { name: 'Second chat' })).not.toBeInTheDocument()
    // Removed from the cache directly — no refetch of the list — and the
    // open conversation is untouched.
    expect(fetchConversations).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'First chat' })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('does nothing when the confirmation is cancelled', async () => {
    await renderWithFirstConversationActive()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Second chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteConversation).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Second chat' })).toBeInTheDocument()
  })

  it('switches to the next conversation when the active one is deleted', async () => {
    await renderWithFirstConversationActive()

    fireEvent.click(screen.getByRole('button', { name: 'Delete First chat' }))
    deleteConversation.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('Hi there')).toBeInTheDocument())
    expect(deleteConversation).toHaveBeenCalledWith(conversation.id)
    expect(fetchConversationMessages).toHaveBeenCalledWith(conversation2.id, expect.anything())
    expect(screen.queryByRole('button', { name: 'First chat' })).not.toBeInTheDocument()
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('shows the empty state when the last remaining conversation is deleted', async () => {
    fetchConversations.mockResolvedValue([conversation])
    await renderWithFirstConversationActive()

    fireEvent.click(screen.getByRole('button', { name: 'Delete First chat' }))
    deleteConversation.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('How can I help you today?')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'First chat' })).not.toBeInTheDocument()
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('shows the error in the dialog and keeps the list unchanged when the delete fails', async () => {
    await renderWithFirstConversationActive()

    fireEvent.click(screen.getByRole('button', { name: 'Delete First chat' }))
    deleteConversation.mockRejectedValueOnce(new Error('Could not delete conversation.'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveTextContent('Could not delete conversation.'),
    )
    expect(screen.getByRole('button', { name: 'First chat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Second chat' })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

describe('Assistant — footer note', () => {
  beforeEach(() => {
    resetAllMocks()
    useAuth.mockReturnValue({ user: { name: 'Ada', avatarId: 'robot' } })
    fetchConversations.mockResolvedValue([])
  })

  it('shows the simulated notice when the server reports the mock provider', async () => {
    fetchChatStatus.mockResolvedValue({ simulated: true })

    renderAssistant()

    expect(await screen.findByText(/Responses are simulated/)).toBeInTheDocument()
    expect(screen.queryByText('AI responses may be inaccurate.')).not.toBeInTheDocument()
  })

  it('shows a neutral note when a real provider is connected', async () => {
    fetchChatStatus.mockResolvedValue({ simulated: false })

    renderAssistant()

    await waitFor(() => expect(fetchChatStatus).toHaveBeenCalled())
    expect(await screen.findByText('AI responses may be inaccurate.')).toBeInTheDocument()
    expect(screen.queryByText(/Responses are simulated/)).not.toBeInTheDocument()
  })
})
