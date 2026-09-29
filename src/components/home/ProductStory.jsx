import StatCard from '../dashboard/StatCard'
import ActivityChart from '../dashboard/ActivityChart'
import RecentProjects from '../dashboard/RecentProjects'
import AgentActivity from '../dashboard/AgentActivity'
import SectionHead from './SectionHead'
import Reveal from './Reveal'
import { heroStats, usageData, recentProjects, agentActivity } from './homeData'
import './ProductStory.css'

// A preview of the real authenticated Dashboard, built from the exact same
// components it uses (StatCard/ActivityChart/RecentProjects/AgentActivity)
// with static presentation data — so this is a faithful preview of the
// product, not a lookalike mockup, and never calls the live API.
function ProductStory() {
  return (
    <section className="home-section home-section-alt product-story">
      <Reveal>
        <SectionHead
          eyebrow="02 — WORKSPACE"
          heading="From a single core, an entire workspace."
          subcopy="Projects, agents and your AI assistant — connected in one system built for real work."
        />
      </Reveal>

      <Reveal className="product-story-frame" as="div">
        <div className="product-story-frame-bar">
          <span className="product-story-dot" />
          <span className="product-story-dot" />
          <span className="product-story-dot" />
          <span className="product-story-frame-title">Dashboard</span>
          <span className="product-story-frame-badge">Preview</span>
        </div>

        <div className="product-story-body">
          <div className="product-story-stats">
            {heroStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="product-story-grid">
            <div className="product-story-main">
              <ActivityChart data={usageData} />
              <RecentProjects projects={recentProjects} />
            </div>
            <div className="product-story-side">
              <AgentActivity agents={agentActivity} />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default ProductStory
