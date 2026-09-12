import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-logo">AI PROJECT</span>
        <nav className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/assistant">AI Assistant</Link>
          <Link to="/agents">Agents</Link>
          <Link to="/projects">Projects</Link>
        </nav>
        <span className="footer-copy">&copy; {year} AI Project. All rights reserved.</span>
      </div>
    </footer>
  )
}

export default Footer
