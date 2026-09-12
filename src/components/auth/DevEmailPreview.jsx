import { useEffect, useState } from 'react'
import { fetchDevOutbox } from './authApi'
import './DevEmailPreview.css'

// Only ever rendered when import.meta.env.DEV is true (checked by callers),
// so this — and its network calls to the dev-only /api/dev/outbox route —
// is stripped from production builds entirely.
function DevEmailPreview({ email, refreshKey }) {
  const [emails, setEmails] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    fetchDevOutbox(email)
      .then((data) => {
        if (!cancelled) setEmails(data)
      })
      .catch(() => {
        if (!cancelled) setEmails([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [email, refreshKey])

  return (
    <div className="dev-email-preview">
      <p className="dev-email-preview-label">Development mode — simulated inbox for {email}</p>
      {isLoading ? (
        <p className="dev-email-preview-empty">Checking...</p>
      ) : emails.length === 0 ? (
        <p className="dev-email-preview-empty">No emails yet.</p>
      ) : (
        emails.map((item) => (
          <div key={item.id} className="dev-email-preview-item">
            <div className="dev-email-preview-subject">{item.subject}</div>
            <pre className="dev-email-preview-body">{item.body}</pre>
          </div>
        ))
      )}
    </div>
  )
}

export default DevEmailPreview
