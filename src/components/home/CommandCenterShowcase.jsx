import '../command/CommandPalette.css'
import SectionHead from './SectionHead'
import Reveal from './Reveal'
import Icon from '../icons/Icon'
import { commandItems } from './homeData'
import './CommandCenterShowcase.css'

const NAV_ICON_NAMES = {
  dashboard: 'dashboard',
  assistant: 'chat',
  projects: 'folder',
  agents: 'bot',
}

// A static, non-interactive preview of the real Ctrl+K CommandPalette
// (reuses its CSS directly). The live palette only ever mounts inside
// AppShell for authenticated users — this preview never opens or intercepts
// keystrokes on the public page.
function CommandCenterShowcase() {
  return (
    <section className="home-section command-showcase">
      <Reveal>
        <SectionHead
          eyebrow="05 — COMMAND CENTER"
          heading="Every action, one keystroke away."
          subcopy="Move through your workspace faster."
        />
      </Reveal>

      <Reveal as="div" className="command-showcase-frame">
        <div className="command-palette-panel command-showcase-panel" aria-hidden="true">
          <div className="command-palette-search">
            <Icon name="search" size={15} />
            <input type="text" placeholder="Type a command or search..." disabled tabIndex={-1} />
            <kbd className="command-palette-esc">ESC</kbd>
          </div>

          <div className="command-palette-results">
            <div className="command-palette-group">
              <div className="command-palette-group-label">Navigate</div>
              {commandItems.navigate.map((item) => (
                <div
                  key={item.id}
                  className={`command-palette-item command-showcase-item ${
                    item.active ? 'command-palette-item-active' : ''
                  }`}
                >
                  <span className="command-showcase-item-left">
                    <Icon name={NAV_ICON_NAMES[item.icon]} size={16} />
                    <span className="command-palette-item-label">{item.label}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="command-palette-group">
              <div className="command-palette-group-label">Actions</div>
              {commandItems.actions.map((item) => (
                <div key={item.id} className="command-palette-item command-showcase-item">
                  <span className="command-showcase-item-left">
                    <Icon name="plus" size={14} />
                    <span className="command-palette-item-label">{item.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default CommandCenterShowcase
