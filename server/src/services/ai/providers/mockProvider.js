// Reports how much history it received, so chat memory can be checked locally
// without an API key.
export const mockProvider = {
  name: 'mock',
  async generateReply({ messages }) {
    const earlier = messages.length - 1
    return `This is a mock response. No AI model is connected. I received ${earlier} earlier message(s) from this conversation.`
  },
}
