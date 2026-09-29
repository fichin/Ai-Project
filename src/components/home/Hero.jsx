import Button from '../Button'
import HeroCore from './HeroCore'
import './Hero.css'

function Hero() {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <div className="home-hero-eyebrow">
          <span className="home-hero-eyebrow-dot" />
          AI WORKSPACE
        </div>

        <h1 className="home-hero-headline">
          BUILD.
          <br />
          AUTOMATE.
          <br />
          THINK.
        </h1>

        <p className="home-hero-subcopy">
          One intelligent workspace for your AI-powered projects, assistants and workflows.
        </p>

        <div className="home-hero-actions">
          <Button to="/dashboard" variant="primary">
            Explore the Workspace
          </Button>
          <Button to="/register" variant="secondary">
            Get Started
          </Button>
        </div>

        <div className="home-hero-hint">
          <kbd className="home-hero-key">⌘K / Ctrl K</kbd>
          to open the Command Center
        </div>
      </div>

      <div className="home-hero-visual">
        <HeroCore />
      </div>
    </section>
  )
}

export default Hero
