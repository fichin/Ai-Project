import AgentIcon from '../agents/AgentIcon'
import { STATUS_LABELS } from '../agents/agentsData'
import '../agents/AgentCard.css'
import SectionHead from './SectionHead'
import Reveal from './Reveal'
import Icon from '../icons/Icon'
import { projectAgentFlows } from './homeData'
import './ProjectsAgentsShowcase.css'

// Reuses the real agent-status pill styling (AgentCard.css) and AgentIcon
// set so the status colors here match /agents exactly.
function ProjectsAgentsShowcase() {
  return (
    <section className="home-section home-section-alt pa-showcase">
      <Reveal>
        <SectionHead
          eyebrow="04 — PROJECTS + AGENTS"
          heading="Every project, run by an agent."
          subcopy="Projects and agents are connected by design — assign work, track status, and let automation handle the rest."
        />
      </Reveal>

      <Reveal as="div" className="pa-flows">
        {projectAgentFlows.map((flow) => (
          <div key={flow.id} className="pa-flow-card">
            <div className="pa-flow-nodes">
              <div className="pa-flow-node">
                <span className="pa-flow-tag">PROJECT</span>
                <span className="pa-flow-value">
                  <Icon name="folder" size={16} />
                  {flow.projectName}
                </span>
              </div>

              <Icon name="arrow-right" size={15} className="pa-flow-arrow" />

              <div className="pa-flow-node">
                <span className="pa-flow-tag">AGENT</span>
                <span className="pa-flow-value">
                  <AgentIcon type={flow.agentIcon} />
                  {flow.agentName}
                </span>
              </div>
            </div>

            <div className={`agent-status agent-status-${flow.status} pa-flow-status`}>
              <span className="status-dot" />
              {STATUS_LABELS[flow.status]}
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

export default ProjectsAgentsShowcase
