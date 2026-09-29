import Button from '../Button'
import Reveal from './Reveal'
import './FinalCTA.css'

function FinalCTA() {
  return (
    <section className="home-section final-cta">
      <div className="final-cta-glow" aria-hidden="true" />
      <Reveal as="div" className="final-cta-inner">
        <h2>Everything your AI workflow needs.</h2>
        <p>Build projects, orchestrate intelligent workflows and work with AI from one connected workspace.</p>
        <div className="final-cta-actions">
          <Button to="/dashboard" variant="primary">
            Explore the Workspace
          </Button>
          <Button to="/register" variant="secondary">
            Get Started
          </Button>
        </div>
      </Reveal>
    </section>
  )
}

export default FinalCTA
