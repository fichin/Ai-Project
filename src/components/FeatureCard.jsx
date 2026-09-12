import { Link } from 'react-router-dom'
import './FeatureCard.css'

function FeatureCard({ icon, title, description, to }) {
  const content = (
    <>
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="feature-card feature-card-link">
        {content}
        <span className="feature-arrow" aria-hidden="true">
          &rarr;
        </span>
      </Link>
    )
  }

  return <div className="feature-card">{content}</div>
}

export default FeatureCard
