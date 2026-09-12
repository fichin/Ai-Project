const MOCK_REPLY = 'This is a mock response. The Claude API is not connected yet.'

export const mockProvider = {
  name: 'mock',
  async generateReply() {
    return MOCK_REPLY
  },
}
