import ChatAvatar from './ChatAvatar'
import './ChatMessage.css'

function ChatMessage({ role, content, isError, userName, userAvatarId }) {
  const isUser = role === 'user'

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <ChatAvatar role={role} userName={userName} userAvatarId={userAvatarId} />
      <div className={`chat-bubble ${isError ? 'chat-bubble-error' : ''}`}>{content}</div>
    </div>
  )
}

export default ChatMessage
