import { useEffect, useRef, useState } from 'react'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatMessage from '../components/chat/ChatMessage'
import TypingIndicator from '../components/chat/TypingIndicator'
import EmptyState from '../components/chat/EmptyState'
import ChatInput from '../components/chat/ChatInput'
import Button from '../components/Button'
import { createUserMessage, createAssistantMessage } from '../components/chat/chatData'
import {
  fetchConversations,
  createConversationRequest,
  fetchConversationMessages,
  sendChatMessage,
} from '../components/chat/chatApi'
import './Assistant.css'

function Assistant() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [conversationsError, setConversationsError] = useState(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const messagesEndRef = useRef(null)

  const activeConversation = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  async function initialize() {
    setIsLoadingConversations(true)
    setConversationsError(null)
    try {
      const data = await fetchConversations()
      setConversations(data)
      if (data.length > 0) {
        setActiveId(data[0].id)
        await loadMessages(data[0].id)
      }
    } catch (error) {
      setConversationsError(error.message)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  async function loadMessages(conversationId) {
    setIsLoadingMessages(true)
    setMessagesError(null)
    try {
      const data = await fetchConversationMessages(conversationId)
      setMessages(data)
    } catch (error) {
      setMessagesError(error.message)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  async function refreshConversationsSilently() {
    try {
      const data = await fetchConversations()
      setConversations(data)
    } catch {
      // Non-critical: the sidebar just keeps its last known list.
    }
  }

  async function handleNewChat() {
    // Reuse the current conversation if it's already empty instead of
    // creating another throwaway row every time "New chat" is clicked.
    if (messages.length === 0) {
      setIsSidebarOpen(false)
      return
    }

    try {
      const conversation = await createConversationRequest()
      setConversations((prev) => [conversation, ...prev])
      setActiveId(conversation.id)
      setMessages([])
      setIsSidebarOpen(false)
    } catch (error) {
      setConversationsError(error.message)
    }
  }

  async function handleSelectConversation(id) {
    setActiveId(id)
    setIsSidebarOpen(false)
    await loadMessages(id)
  }

  async function handleSend(text) {
    const userMessage = createUserMessage(text)
    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    try {
      const data = await sendChatMessage(activeId, text)
      const assistantMessage = createAssistantMessage(data.reply)
      setMessages((prev) => [...prev, assistantMessage])

      if (activeId !== data.conversationId) {
        setActiveId(data.conversationId)
      }
      refreshConversationsSilently()
    } catch (error) {
      const errorMessage = createAssistantMessage(error.message, true)
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const topbarTitle = activeConversation?.title ?? 'New conversation'

  return (
    <div className="assistant">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="chat-topbar-title">{topbarTitle}</span>
        </div>

        {isLoadingConversations ? (
          <p className="chat-status-message">Loading conversations...</p>
        ) : conversationsError ? (
          <div className="chat-status-message">
            <p>{conversationsError}</p>
            <Button variant="secondary" onClick={initialize}>
              Retry
            </Button>
          </div>
        ) : isLoadingMessages ? (
          <p className="chat-status-message">Loading messages...</p>
        ) : messagesError ? (
          <div className="chat-status-message">
            <p>{messagesError}</p>
            <Button variant="secondary" onClick={() => loadMessages(activeId)}>
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
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={isTyping || isLoadingConversations} />
      </div>
    </div>
  )
}

export default Assistant
