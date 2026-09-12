import './ChatSidebar.css'

function ChatSidebar({ conversations, activeId, onSelect, onNewChat, isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`chat-sidebar ${isOpen ? 'chat-sidebar-open' : ''}`}>
        <button className="new-chat-btn" onClick={onNewChat}>
          <span className="new-chat-icon">+</span>
          New chat
        </button>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`conversation-item ${conversation.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(conversation.id)}
            >
              {conversation.title}
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}

export default ChatSidebar
