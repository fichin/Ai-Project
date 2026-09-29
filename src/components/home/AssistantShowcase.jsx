import { Link } from 'react-router-dom'
import ChatMessage from '../chat/ChatMessage'
import SectionHead from './SectionHead'
import Reveal from './Reveal'
import Icon from '../icons/Icon'
import { assistantExchange } from './homeData'
import './AssistantShowcase.css'

const aiContent = (
  <>
    <p className="assistant-showcase-ai-lead">I found three opportunities to improve the workflow:</p>
    <ul className="assistant-showcase-bullets">
      {assistantExchange.bullets.map((bullet) => (
        <li key={bullet}>
          <Icon name="check" size={13} strokeWidth={2.5} className="assistant-showcase-bullet-icon" />
          {bullet}
        </li>
      ))}
    </ul>
  </>
)

// Chat bubbles reuse the real ChatMessage component (same one rendered on
// /assistant) so the preview matches the live product pixel-for-pixel. The
// conversation itself is static copy, not a live AI response.
function AssistantShowcase() {
  return (
    <section className="home-section assistant-showcase">
      <Reveal as="div" className="assistant-showcase-inner">
        <div className="assistant-showcase-copy">
          <SectionHead
            align="left"
            eyebrow="03 — ASSISTANT"
            heading="Turn ideas into intelligent workflows."
            subcopy="Ask questions, generate plans and act on your projects without leaving your workspace. The assistant understands the context of everything you build."
          />
          <Link className="assistant-showcase-link" to="/assistant">
            Try the Assistant
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>

        <div className="assistant-showcase-panel">
          <div className="assistant-showcase-header">
            <span className="assistant-showcase-header-title">AI Assistant</span>
            <span className="assistant-showcase-status">
              <span className="assistant-showcase-status-dot" />
              ONLINE
            </span>
          </div>

          <div className="assistant-showcase-messages">
            <ChatMessage role="user" content={assistantExchange.user} userName="You" />
            <ChatMessage role="assistant" content={aiContent} />
          </div>

          <div className="assistant-showcase-input">
            <span>Ask anything about your workspace...</span>
            <span className="assistant-showcase-send" aria-hidden="true">
              <Icon name="arrow-right" size={15} style={{ transform: 'rotate(-90deg)' }} />
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default AssistantShowcase
