import { Router } from 'express'
import { getStatsForUser, getUsageSeries, getAgentActivity, getRecentActivity } from '../db/dashboardRepository.js'
import { listProjectsByUser } from '../db/projectsRepository.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

function toRecentProjectDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    lastUpdated: formatRelativeTime(row.updated_at),
    agentCount: row.agent_count ?? 0,
  }
}

function toAgentActivityDto(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    projectName: row.project_name ?? null,
    conversationCount: row.conversation_count ?? 0,
    lastUpdated: formatRelativeTime(row.updated_at),
  }
}

const ACTIVITY_LABELS = {
  project_created: 'Project created',
  project_updated: 'Project updated',
  project_deleted: 'Project deleted',
  agent_created: 'Agent created',
  agent_updated: 'Agent updated',
  agent_deleted: 'Agent deleted',
  profile_updated: 'Profile updated',
  preferences_updated: 'Preferences updated',
  conversation_started: 'AI conversation started',
}

// The feed icon only distinguishes project/agent/conversation (see
// ActivityFeed's TYPE_ICONS), so a specific action_type like
// "project_deleted" still maps down to the broader "project" icon category.
function iconCategory(actionType) {
  if (actionType.startsWith('project_')) return 'project'
  if (actionType.startsWith('agent_')) return 'agent'
  if (actionType === 'conversation_started') return 'conversation'
  return 'project'
}

function toActivityDto(row) {
  return {
    id: `${row.action_type}-${row.id}`,
    type: iconCategory(row.action_type),
    title: ACTIVITY_LABELS[row.action_type] ?? 'Activity',
    subtitle: row.title,
    timestamp: row.timestamp,
    relativeTime: formatRelativeTime(row.timestamp),
  }
}

router.get(
  '/dashboard/summary',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    const stats = await getStatsForUser(userId)
    const usage = await getUsageSeries(userId, 14)
    const recentProjects = (await listProjectsByUser(userId)).slice(0, 4).map(toRecentProjectDto)
    const agentActivity = (await getAgentActivity(userId, 6)).map(toAgentActivityDto)
    const recentActivity = (await getRecentActivity(userId, 8)).map(toActivityDto)

    res.json({ stats, usage, recentProjects, agentActivity, recentActivity })
  }),
)

export default router
