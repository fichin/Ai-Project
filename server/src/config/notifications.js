export const NOTIFICATION_TYPES = {
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  AGENT_DELETED: 'agent_deleted',
}

// Message shown in the notifications dropdown, e.g. `Project "Pricing
// Intelligence" was created.` Kept here (not stored per-row) so wording can
// change without a migration — same approach as config/activity.js.
const TEMPLATES = {
  [NOTIFICATION_TYPES.PROJECT_CREATED]: (name) => `Project "${name}" was created.`,
  [NOTIFICATION_TYPES.PROJECT_UPDATED]: (name) => `Project "${name}" was updated.`,
  [NOTIFICATION_TYPES.PROJECT_DELETED]: (name) => `Project "${name}" was deleted.`,
  [NOTIFICATION_TYPES.AGENT_CREATED]: (name) => `Agent "${name}" was created.`,
  [NOTIFICATION_TYPES.AGENT_UPDATED]: (name) => `Agent "${name}" was updated.`,
  [NOTIFICATION_TYPES.AGENT_DELETED]: (name) => `Agent "${name}" was deleted.`,
}

export function describeNotification(type, entityName) {
  const template = TEMPLATES[type]
  if (!template) return 'Notification'
  return template(entityName ?? 'Untitled')
}
