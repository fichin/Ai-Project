import SectionHead from './SectionHead'
import Reveal from './Reveal'
import Icon from '../icons/Icon'
import { workspaceFeatures } from './homeData'
import './WorkspaceSection.css'

const FEATURE_ICON_NAMES = {
  assistant: 'chat',
  projects: 'folder',
  agents: 'bot',
  command: 'command',
}

// Deliberately not a grid of cards — the approved design calls for
// restrained composition here, a calm recap before the final CTA.
function WorkspaceSection() {
  return (
    <section className="home-section home-section-alt workspace-section">
      <Reveal>
        <SectionHead eyebrow="06 — COMPLETE WORKSPACE" heading="One connected system for AI-powered work." />
      </Reveal>

      <Reveal as="div" className="workspace-features">
        {workspaceFeatures.map((feature) => (
          <div key={feature.title} className="workspace-feature">
            <Icon name={FEATURE_ICON_NAMES[feature.icon]} size={22} className="workspace-feature-icon" />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

export default WorkspaceSection
