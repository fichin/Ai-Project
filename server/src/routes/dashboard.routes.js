import { Router } from 'express'
import { getStatsForUser, getUsageSeries, getAgentActivity, getRecentActivity } from '../db/dashboardRepository.js'
import { listProjectsByUser } from '../db/projectsRepository.js'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'

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

function activityLabel(entity, action) {
  if (entity === 'project') return action === 'created' ? 'Project created' : 'Project updated'
  if (entity === 'agent') return action === 'created' ? 'Agent created' : 'Agent updated'
  if (entity === 'conversation') return 'AI conversation started'
  return 'Activity'
}

function toActivityDto(row) {
  return {
    id: `${row.entity}-${row.id}`,
    type: row.entity,
    title: activityLabel(row.entity, row.action),
    subtitle: row.title,
    timestamp: row.updated_at,
    relativeTime: formatRelativeTime(row.updated_at),
  }
}

router.get('/dashboard/summary', (req, res) => {
  const userId = req.user.id

  const stats = getStatsForUser(userId)
  const usage = getUsageSeries(userId, 14)
  const recentProjects = listProjectsByUser(userId).slice(0, 4).map(toRecentProjectDto)
  const agentActivity = getAgentActivity(userId, 6).map(toAgentActivityDto)
  const recentActivity = getRecentActivity(userId, 8).map(toActivityDto)

  res.json({ stats, usage, recentProjects, agentActivity, recentActivity })
})

export default router
