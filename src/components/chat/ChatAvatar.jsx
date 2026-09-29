import Avatar from '../Avatar'
import Icon from '../icons/Icon'

// Shared by ChatMessage and TypingIndicator so both render the "who said
// this" avatar identically. Reuses the app's existing Avatar component for
// the user side and the same gradient icon-badge/chat-bubble treatment used
// elsewhere (dashboard icons, "AI Assistant" nav) for the assistant side,
// rather than inventing new visuals just for chat.
function ChatAvatar({ role, userName, userAvatarId }) {
  if (role === 'user') {
    return <Avatar name={userName} avatarId={userAvatarId} size={32} />
  }

  return (
    <span className="chat-avatar-assistant" aria-hidden="true">
      <Icon name="chat" size={16} />
    </span>
  )
}

export default ChatAvatar
