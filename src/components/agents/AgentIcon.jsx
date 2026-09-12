const PATHS = {
  research: (
    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />
  ),
  code: <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />,
  support: (
    <path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-1v-7a1 1 0 0 1 1-1h2M4 12v5a2 2 0 0 0 2 2h1v-7a1 1 0 0 0-1-1H4" />
  ),
  pen: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  chart: <path d="M3 3v18h18M7 15l4-5 3 3 5-7" />,
  shield: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6Z" />,
  clipboard: (
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1ZM6 6h12v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1Z" />
  ),
  server: (
    <path d="M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01" />
  ),
  default: <path d="M12 2v20M2 12h20" />,
}

function AgentIcon({ type }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {PATHS[type] ?? PATHS.default}
    </svg>
  )
}

export default AgentIcon
