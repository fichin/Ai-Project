export class AiProviderError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AiProviderError'
    this.status = 502
  }
}
