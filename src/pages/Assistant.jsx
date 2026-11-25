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

const CONVERSATIONS_QUERY_KEY = ['conversations']

function messagesKey(conversationId) {
  return ['conversations', conversationId, 'messages']
}

function Assistant() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // Kept apart from the query's error so Retry can clear it, but shown in the same slot.
  const [createConversationError, setCreateConversationError] = useState(null)
  const messagesEndRef = useRef(null)
  // Auto-select only after the first successful load, so later list changes
  // don't yank the user to another chat, and a Retry after a failure still gets to.
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
  // After a failure, `isLoading` stays false during a retry; only `isFetching` flips.
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
      // One-time setup from loaded data, guarded by hasAutoSelectedRef.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(conversations[0].id)
    }
  }, [isFetchingConversations, conversationsErrorObj, conversations])

  // Picks up server-assigned titles after a send; a failure here isn't worth an error.
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

  // Not optimistic: a failed delete must leave the list untouched.
  const deleteConversationMutation = useMutation({
    mutationFn: (conversation) => deleteConversation(conversation.id),
    onSuccess: (_data, conversation) => {
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((c) => c.id !== conversation.id),
      )
      queryClient.removeQueries({ queryKey: messagesKey(conversation.id) })
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
    // Nothing to do: onSuccess above already updated the cache.
    () => {},
  )

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
        // The server created a new conversation, so move the exchange to its real key.
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
    // Not awaited: the mutation's callbacks handle success and failure.
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
          // A log region reads out new replies politely; "additions" stops it
          // re-reading the whole chat when old messages re-render.
          <div
            className="messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation"
          >
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
