export const STATUS_LABELS = {
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
}

export const STATUS_FILTERS = ['all', 'active', 'paused', 'draft']

export const DRAFT_AGENT_DEFAULTS = {
  name: 'Untitled Agent',
  description: 'Configure this agent to give it a purpose and get started.',
  status: 'draft',
}

export function nextStatus(status) {
  if (status === 'active') return 'paused'
  return 'active'
}

export function actionLabel(status) {
  if (status === 'active') return 'Pause'
  if (status === 'paused') return 'Resume'
  return 'Activate'
}
