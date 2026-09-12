import Button from '../components/Button'
import FeatureCard from '../components/FeatureCard'
import Footer from '../components/Footer'
import './Home.css'

const FEATURES = [
  {
    to: '/assistant',
    title: 'AI Assistant',
    description: 'Chat with a context-aware assistant that helps you plan, write, and debug in real time.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.4-4.2A8.5 8.5 0 1 1 21 11.5Z" />
      </svg>
    ),
  },
  {
    to: '/agents',
    title: 'Autonomous Agents',
    description: 'Deploy agents that plan, execute, and adapt across multi-step tasks with minimal supervision.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M12 11V7M8 7h8M9 16h.01M15 16h.01" />
      </svg>
    ),
  },
  {
    to: '/projects',
    title: 'Project Workspace',
    description: 'Organize your work into projects, track progress, and keep every AI-driven task in one place.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
    ),
  },
  {
    title: 'Built to Scale',
    description: 'A foundation designed for production: fast, reliable, and ready to grow with your workload.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </svg>
    ),
  },
]

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-badge">AI-POWERED PLATFORM</div>

        <h1>
          BUILD SOMETHING
          <span>INTELLIGENT</span>
        </h1>

        <p>
          One platform for AI assistants, autonomous agents, and the projects they power.
          Ship intelligent products faster, without stitching tools together yourself.
        </p>

        <div className="hero-actions">
          <Button to="/assistant" variant="primary">
            Get Started
          </Button>
          <Button to="/agents" variant="secondary">
            Explore Agents
          </Button>
        </div>
      </section>

      <section className="features">
        <div className="features-header">
          <h2>Everything you need to build with AI</h2>
          <p>A focused set of tools that work together, not against each other.</p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="cta">
        <h2>Ready to build?</h2>
        <p>Jump into the assistant and start shipping in minutes.</p>
        <Button to="/assistant" variant="primary">
          Get Started
        </Button>
      </section>

      <Footer />
    </div>
  )
}

export default Home
