import './EmptyState.css'

const SUGGESTIONS = [
  'Explain what this platform can do',
  'Help me write a project brief',
  'Give me ideas for a landing page',
  'Debug an error in my code',
]

function EmptyState({ onSuggestionClick }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        AI
      </div>
      <h2>How can I help you today?</h2>
      <p>Ask a question or try one of these to see the chat in action.</p>

      <div className="suggestion-grid">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            className="suggestion-chip"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

export default EmptyState
