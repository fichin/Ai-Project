// Shared input-length ceilings, used anywhere a route validates a "name",
// "description", or chat message field — kept in one place so the limits
// stay the same everywhere rather than drifting per route.
export const MAX_NAME_LENGTH = 100
export const MAX_DESCRIPTION_LENGTH = 1000
export const MAX_CHAT_MESSAGE_LENGTH = 2000
