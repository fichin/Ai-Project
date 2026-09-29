// Express 4 doesn't forward a rejected promise from an async route handler
// (or async middleware) to error-handling middleware the way Express 5
// does — without this, a rejected query inside an async handler would hang
// the request instead of reaching errorHandler the way a synchronous
// handler's thrown error already does.
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}
