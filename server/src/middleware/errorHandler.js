export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' })
  }

  if (err.name === 'AiProviderError' || err.name === 'ConversationNotFoundError') {
    return res.status(err.status).json({ error: err.message })
  }

  console.error(err)
  res.status(err.status || 500).json({ error: 'Internal server error' })
}
