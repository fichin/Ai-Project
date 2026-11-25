import ChatAvatar from './ChatAvatar'
import './TypingIndicator.css'

function TypingIndicator() {
  return (
    <div className="chat-message chat-message-assistant">
      <ChatAvatar role="assistant" />
      {/* Real text, not aria-label: screen readers ignore aria-label on a plain div. */}
      <div className="chat-bubble typing-bubble" role="status">
        <span className="sr-only">Assistant is typing…</span>
        <span className="typing-dot" aria-hidden="true" />
        <span className="typing-dot" aria-hidden="true" />
        <span className="typing-dot" aria-hidden="true" />
      </div>
    </div>
  )
}

export default TypingIndicator
