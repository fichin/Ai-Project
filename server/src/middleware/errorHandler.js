export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' })
  }

  // Thrown by express.json()'s body-parser when a request exceeds the
  // limit set in app.js — give a clear reason instead of falling through
  // to the generic 500 message below.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' })
  }

  const knownErrors = [
    'AiProviderError',
    'ConversationNotFoundError',
    'ConversationLimitError',
    'ConversationQuotaError',
    'UserAiQuotaError',
    'GlobalAiQuotaError',
  ]
  if (knownErrors.includes(err.name)) {
    return res.status(err.status).json({ error: err.message })
  }

  console.error(err)
  res.status(err.status || 500).json({ error: 'Internal server error' })
}
