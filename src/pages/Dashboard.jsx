import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { fetchDashboardSummary } from '../components/dashboard/dashboardApi'
import StatCard from '../components/dashboard/StatCard'
import ActivityChart from '../components/dashboard/ActivityChart'
import QuickActions from '../components/dashboard/QuickActions'
import RecentProjects from '../components/dashboard/RecentProjects'
import AgentActivity from '../components/dashboard/AgentActivity'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import Button from '../components/Button'
import './Dashboard.css'

function firstName(name) {
  if (!name) return ''
  return name.trim().split(/\s+/)[0]
}

function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const summary = await fetchDashboardSummary()
      setData(summary)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back{user?.name ? `, ${firstName(user.name)}` : ''} 👋</h1>
            <p>Here&apos;s what&apos;s happening across your AI workspace.</p>
          </div>
          <div className="dashboard-status">
            <span className="dashboard-status-dot" />
            Workspace active
          </div>
        </div>

        {error ? (
          <div className="dashboard-error">
            <p>{error}</p>
            <Button variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="dashboard-stats-grid">
              <StatCard
                icon="chat"
                label="AI Conversations"
                value={data?.stats.conversations.total}
                trendPct={data?.stats.conversations.trendPct}
                secondary={`${data?.stats.conversations.last7Days ?? 0} in the last 7 days`}
                isLoading={isLoading}
              />
              <StatCard
                icon="folder"
                label="Active Projects"
                value={data?.stats.projects.active}
                secondary={`${data?.stats.projects.total ?? 0} total projects`}
                isLoading={isLoading}
              />
              <StatCard
                icon="bot"
                label="Agents"
                value={data?.stats.agents.total}
                secondary={`${data?.stats.agents.active ?? 0} currently active`}
                isLoading={isLoading}
              />
              <StatCard
                icon="spark"
                label="AI Messages"
                value={data?.stats.messages.total}
                trendPct={data?.stats.messages.trendPct}
                secondary={`${data?.stats.messages.last7Days ?? 0} in the last 7 days`}
                isLoading={isLoading}
              />
            </div>

            <div className="dashboard-main-grid">
              <div className="dashboard-column-main">
                <ActivityChart data={data?.usage} isLoading={isLoading} />
                <QuickActions />
                <RecentProjects projects={data?.recentProjects} isLoading={isLoading} />
              </div>
              <div className="dashboard-column-side">
                <AgentActivity agents={data?.agentActivity} isLoading={isLoading} />
                <ActivityFeed items={data?.recentActivity} isLoading={isLoading} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard
