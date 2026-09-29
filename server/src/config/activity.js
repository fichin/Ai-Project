export const ACTIVITY_TYPES = {
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  AGENT_DELETED: 'agent_deleted',
  PROFILE_UPDATED: 'profile_updated',
  PREFERENCES_UPDATED: 'preferences_updated',
}

// Verb shown before entity_name in the activity feed, e.g. "Created project
// Pricing Intelligence". Kept here (not stored per-row) so wording can
// change without a migration.
const VERBS = {
  [ACTIVITY_TYPES.PROJECT_CREATED]: 'Created project',
  [ACTIVITY_TYPES.PROJECT_UPDATED]: 'Updated project',
  [ACTIVITY_TYPES.PROJECT_DELETED]: 'Deleted project',
  [ACTIVITY_TYPES.AGENT_CREATED]: 'Created agent',
  [ACTIVITY_TYPES.AGENT_UPDATED]: 'Updated agent',
  [ACTIVITY_TYPES.AGENT_DELETED]: 'Deleted agent',
}

export function describeActivity(type, entityName) {
  const verb = VERBS[type]
  if (verb) return entityName ? `${verb} ${entityName}` : verb
  if (type === ACTIVITY_TYPES.PROFILE_UPDATED) return 'Updated profile'
  if (type === ACTIVITY_TYPES.PREFERENCES_UPDATED) return 'Updated account preferences'
  return 'Activity'
}
