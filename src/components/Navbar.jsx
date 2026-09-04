function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">AI PROJECT</div>

      <div className="nav-links">
        <a href="/">Home</a>
        <a href="/assistant">AI Assistant</a>
        <a href="/agents">Agents</a>
        <a href="/projects">Projects</a>
      </div>

      <button className="nav-button">Get Started</button>
    </nav>
  )
}

export default Navbar