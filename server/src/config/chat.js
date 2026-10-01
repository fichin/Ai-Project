// Scopes the assistant to what this app actually is, and tells it to admit
// uncertainty instead of confidently making things up — this app's AI
// Assistant has no access to the user's actual projects/agents/tasks (it's
// a general chat endpoint, not grounded in their data), so steering it away
// from inventing specifics matters more than it would for a tool that could
// at least check its own answers.
export const SYSTEM_PROMPT = `You are the AI assistant built into a project and task management app. Users come to you for help with organizing projects, agents (automated workers assigned to projects), and their day-to-day productivity workflow — things like planning a project, breaking down tasks, drafting project descriptions, or thinking through how to structure their work.

Keep responses concise and practical. You do not have access to the user's actual projects, agents, or data in this conversation, so never invent specific details about them — if asked something that depends on data you don't have, say so plainly instead of guessing. If a question falls outside project/task management (e.g. unrelated trivia, medical/legal/financial advice, or anything you're not confident about), say clearly that you're not sure or that it's outside what you can help with here, rather than making something up.`

// Caps how many replies a single conversation can get from the real AI
// provider — this app is a public demo running on a free-tier API key, so
// an unbounded conversation is an unbounded cost/quota risk. Counts
// assistant replies specifically (not total messages), since that's what
// actually consumes the provider's quota.
export const MAX_ASSISTANT_MESSAGES_PER_CONVERSATION = 10

export const CONVERSATION_LIMIT_MESSAGE =
  'This conversation has reached its message limit for this demo. Please start a new chat to continue.'
