import Icon from '../icons/Icon'
import './ChatSidebar.css'

function ChatSidebar({ conversations, activeId, onSelect, onNewChat, onDelete, isOpen, onClose }) {
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
            // A row wrapping two sibling buttons (select / delete) rather
            // than nesting the delete button inside the select one, which
            // isn't valid HTML and would make both fire on one click.
            <div
              key={conversation.id}
              className={`conversation-row ${conversation.id === activeId ? 'active' : ''}`}
            >
              <button
                className={`conversation-item ${conversation.id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(conversation.id)}
              >
                {conversation.title}
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="conversation-delete-btn"
                  aria-label={`Delete ${conversation.title}`}
                  title="Delete conversation"
                  onClick={() => onDelete(conversation)}
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}

export default ChatSidebar
