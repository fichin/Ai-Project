import './ChatMessage.css'

function ChatMessage({ role, content, isError }) {
  const isUser = role === 'user'

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-avatar" aria-hidden="true">
        {isUser ? 'Y' : 'AI'}
      </div>
      <div className={`chat-bubble ${isError ? 'chat-bubble-error' : ''}`}>{content}</div>
    </div>
  )
}

export default ChatMessage
