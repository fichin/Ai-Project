import './TypingIndicator.css'

function TypingIndicator() {
  return (
    <div className="chat-message chat-message-assistant">
      <div className="chat-avatar" aria-hidden="true">
        AI
      </div>
      <div className="chat-bubble typing-bubble" aria-label="Assistant is typing">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

export default TypingIndicator
