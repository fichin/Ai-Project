import { lazy, Suspense } from 'react'
import ChatAvatar from './ChatAvatar'
import './ChatMessage.css'

// Lazy so react-markdown and its parser stay out of the bundle for pages
// that render ChatMessage without Markdown — notably Home's
// AssistantShowcase, which passes static JSX rather than a string.
const MarkdownContent = lazy(() => import('./MarkdownContent'))

function ChatMessage({ role, content, isError, userName, userAvatarId }) {
  const isUser = role === 'user'
  // User messages and client-side error notices stay plain text; only real
  // assistant replies (always strings from the API) are rendered as Markdown.
  const renderMarkdown = !isUser && !isError && typeof content === 'string'

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <ChatAvatar role={role} userName={userName} userAvatarId={userAvatarId} />
      <div className={`chat-bubble ${isError ? 'chat-bubble-error' : ''}`}>
        {renderMarkdown ? (
          // Plain text while the Markdown chunk loads (first render only).
          <Suspense fallback={content}>
            <MarkdownContent>{content}</MarkdownContent>
          </Suspense>
        ) : (
          content
        )}
      </div>
    </div>
  )
}

export default ChatMessage
