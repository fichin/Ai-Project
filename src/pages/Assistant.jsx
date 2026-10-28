import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatMessage from '../components/chat/ChatMessage'
import TypingIndicator from '../components/chat/TypingIndicator'
import EmptyState from '../components/chat/EmptyState'
import ChatInput from '../components/chat/ChatInput'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import Icon from '../components/icons/Icon'
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation'
import { createUserMessage, createAssistantMessage, fromServerMessage } from '../components/chat/chatData'
import {
  fetchConversations,
  createConversationRequest,
  deleteConversation,
  fetchConversationMessages,
  fetchChatStatus,
  sendChatMessage,
} from '../components/chat/chatApi'
import './Assistant.css'

// Assistant's data (conversations/messages) is entirely its own — it
// doesn't read or write anything from the `['projects']`/`['agents']`
// caches, so this page introduces its own query keys rather than sharing
// one of theirs.
const CONVERSATIONS_QUERY_KEY = ['conversations']

function messagesKey(conversationId) {
  return ['conversations', conversationId, 'messages']
}

function Assistant() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // Surfaces a "New chat" failure in the same error+Retry slot the
  // conversations query's own error uses — the pre-migration code shared
  // one `conversationsError` state between the two — without conflating a
  // mutation's error with the query's own error object.
  const [createConversationError, setCreateConversationError] = useState(null)
  const messagesEndRef = useRef(null)
  // Auto-selects the most recent conversation exactly once, tied to the
  // first successful conversations load — same as the original
  // `initialize()` (called once on mount) rather than re-running on every
  // later change to the list, e.g. after creating or sending a first
  // message. Stays false across a failed attempt so a Retry still gets to
  // auto-select once it succeeds.
  const hasAutoSelectedRef = useRef(false)

  const {
    data: conversations = [],
    isLoading: isLoadingConversationsRaw,
    isFetching: isFetchingConversations,
    error: conversationsErrorObj,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: ({ signal }) => fetchConversations({ signal }),
  })
  const conversationsQueryError = conversationsErrorObj?.message ?? null
  const conversationsError = conversationsQueryError ?? createConversationError
  // Same reasoning as Projects/Agents/Dashboard: once a load has failed,
  // `error` stays set for the duration of a manual retry — only
  // `isFetching` flips true — so this covers the retry-in-flight case the
  // same way the original's `isLoadingConversations` (reset to true on
  // every retry) did.
  const isShowingConversationsLoadingState =
    isLoadingConversationsRaw || (Boolean(conversationsQueryError) && isFetchingConversations)

  const {
    data: messages = [],
    isLoading: isLoadingMessagesRaw,
    isFetching: isFetchingMessages,
    error: messagesErrorObj,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: messagesKey(activeId),
    queryFn: ({ signal }) => fetchConversationMessages(activeId, { signal }),
    enabled: activeId !== null,
  })
  const messagesError = messagesErrorObj?.message ?? null
  const isShowingMessagesLoadingState = isLoadingMessagesRaw || (Boolean(messagesError) && isFetchingMessages)

  // Only drives the footer note under the input, so a loading or failed
  // status check just falls back to the neutral (non-simulated) note.
  const { data: chatStatus } = useQuery({
    queryKey: ['chat', 'status'],
    queryFn: ({ signal }) => fetchChatStatus({ signal }),
    staleTime: Infinity,
  })
  const isSimulated = chatStatus?.simulated === true

  const activeConversation = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    if (hasAutoSelectedRef.current) return
    if (isFetchingConversations) return
    if (conversationsErrorObj) return
    hasAutoSelectedRef.current = true
    if (conversations.length > 0) {
      // One-time initial-data-driven state setup (see the `hasAutoSelectedRef`
      // comment above), same category of exception as AuthProvider's
      // restoreSession() and useCancellableLoad's initial load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(conversations[0].id)
    }
  }, [isFetchingConversations, conversationsErrorObj, conversations])

  // Re-fetched (and swallowed on failure) after every send so the sidebar
  // picks up e.g. a brand-new conversation's server-assigned title without
  // ever surfacing an error for it — same as the original's
  // `refreshConversationsSilently`, just writing into the cache instead of
  // local state.
  async function refreshConversationsSilently() {
    try {
      const data = await fetchConversations()
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, data)
    } catch {
      // Non-critical — the sidebar just keeps its last known list.
    }
  }

  const createConversationMutation = useMutation({
    mutationFn: () => createConversationRequest(),
    onSuccess: (created) => {
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (prev) => [created, ...(prev ?? [])])
    },
  })

  // Same non-optimistic shape as Projects/Agents: the cache only changes in
  // onSuccess, after the server confirms the delete, so a failed request
  // leaves the list exactly as it was and the error shows in the dialog.
  const deleteConversationMutation = useMutation({
    mutationFn: (conversation) => deleteConversation(conversation.id),
    onSuccess: (_data, conversation) => {
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((c) => c.id !== conversation.id),
      )
      queryClient.removeQueries({ queryKey: messagesKey(conversation.id) })
      // Deleting the open conversation moves to the most recent remaining
      // one, or to the empty state (activeId null) when none are left.
      const remaining = queryClient.getQueryData(CONVERSATIONS_QUERY_KEY) ?? []
      setActiveId((current) => (current === conversation.id ? (remaining[0]?.id ?? null) : current))
    },
  })

  const {
    pendingItem: deletingConversation,
    isDeleting,
    error: deleteError,
    request: handleRequestDelete,
    cancel: handleCancelDelete,
    confirm: handleConfirmDelete,
  } = useDeleteConfirmation(
    (conversation) => deleteConversationMutation.mutateAsync(conversation),
    // The cache is already synced by the mutation's own onSuccess above —
    // this hook's onDeleted only needs to exist to satisfy its signature.
    () => {},
  )

  // The optimistic echo, the error-message-appended-on-failure, and moving
  // to a server-assigned conversation id all pre-date this migration —
  // preserved as-is, just operating on the query cache instead of local
  // `messages` state.
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, text }) => sendChatMessage(conversationId, text),
    onMutate: async ({ conversationId, text }) => {
      const key = messagesKey(conversationId)
      await queryClient.cancelQueries({ queryKey: key })
      const optimisticMessage = createUserMessage(text)
      queryClient.setQueryData(key, (prev) => [...(prev ?? []), optimisticMessage])
      return { key, optimisticMessage }
    },
    onSuccess: (data, variables, context) => {
      const settled = [
        ...(queryClient.getQueryData(context.key) ?? []).filter(
          (message) => message.id !== context.optimisticMessage.id,
        ),
        fromServerMessage(data.userMessage),
        fromServerMessage(data.assistantMessage),
      ]

      if (variables.conversationId !== data.conversationId) {
        // Sent with no conversation selected (or a superseded one) and the
        // server created a new one for it — move the exchange to its real
        // key and switch the view to it.
        queryClient.setQueryData(messagesKey(data.conversationId), settled)
        setActiveId(data.conversationId)
      } else {
        queryClient.setQueryData(context.key, settled)
      }

      refreshConversationsSilently()
    },
    onError: (error, _variables, context) => {
      const errorMessage = createAssistantMessage(error.message, true)
      queryClient.setQueryData(context.key, (prev) => [...(prev ?? []), errorMessage])
    },
  })
  const isTyping = sendMessageMutation.isPending

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  async function handleNewChat() {
    // Reuse the current conversation if it's already empty instead of
    // creating another throwaway row every time "New chat" is clicked.
    if (messages.length === 0) {
      setIsSidebarOpen(false)
      return
    }

    try {
      const conversation = await createConversationMutation.mutateAsync()
      setActiveId(conversation.id)
      setCreateConversationError(null)
      setIsSidebarOpen(false)
    } catch (error) {
      setCreateConversationError(error.message)
    }
  }

  function handleSelectConversation(id) {
    setActiveId(id)
    setIsSidebarOpen(false)
  }

  function handleSend(text) {
    // Fire-and-forget, same as before: neither ChatInput nor EmptyState
    // await this — the optimistic echo, success, and failure states are
    // all handled by the mutation's own onMutate/onSuccess/onError above.
    sendMessageMutation.mutate({ conversationId: activeId, text })
  }

  const topbarTitle = activeConversation?.title ?? 'New conversation'

  return (
    <div className="assistant">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleRequestDelete}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="chat-main">
        <div className="chat-topbar">
          <button
            className="sidebar-toggle"
            aria-label="Open conversation list"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <span className="chat-topbar-title">{topbarTitle}</span>
        </div>

        {isShowingConversationsLoadingState ? (
          <p className="chat-status-message">Loading conversations...</p>
        ) : conversationsError ? (
          <div className="chat-status-message">
            <p>{conversationsError}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setCreateConversationError(null)
                refetchConversations()
              }}
            >
              Retry
            </Button>
          </div>
        ) : isShowingMessagesLoadingState ? (
          <p className="chat-status-message">Loading messages...</p>
        ) : messagesError ? (
          <div className="chat-status-message">
            <p>{messagesError}</p>
            <Button variant="secondary" onClick={() => refetchMessages()}>
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSend} />
        ) : (
          <div className="messages">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isError={message.isError}
                userName={user?.name}
                userAvatarId={user?.avatarId}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isTyping || isShowingConversationsLoadingState}
          simulated={isSimulated}
        />
      </div>

      {deletingConversation && (
        <ConfirmDialog
          title="Delete conversation"
          message={`Are you sure you want to delete "${deletingConversation.title}"? Its messages will be deleted too. This cannot be undone.`}
          confirmLabel="Delete"
          isSubmitting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}

export default Assistant
