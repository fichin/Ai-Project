import { useQuery } from '@tanstack/react-query'
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

const DASHBOARD_QUERY_KEY = ['dashboard', 'summary']

function firstName(name) {
  if (!name) return ''
  return name.trim().split(/\s+/)[0]
}

function Dashboard() {
  const { user } = useAuth()
  // Retries are disabled app-wide (see lib/queryClient.js) so a failed load
  // shows the error immediately with a manual "Retry" button, rather than
  // TanStack Query's default silent background retries.
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: loadDashboard,
  } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: ({ signal }) => fetchDashboardSummary({ signal }),
  })
  const loadError = error?.message ?? null
  // The original hand-rolled loader cleared its error state the instant a
  // retry started, so the error+Retry block was immediately replaced by the
  // stats grid (now showing its own loading skeletons) rather than staying
  // visible during the refetch. TanStack Query instead keeps `error` set
  // until the retry settles, so `isFetching` reproduces that same swap here.
  const isShowingErrorState = Boolean(loadError) && !isFetching
  const isShowingLoadingState = isLoading || (Boolean(loadError) && isFetching)

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">Welcome back{user?.name ? `, ${firstName(user.name)}` : ''} 👋</h1>
            <p className="page-subtitle">Here&apos;s what&apos;s happening across your AI workspace.</p>
          </div>
          <div className="dashboard-status">
            <span className="dashboard-status-dot" />
            Workspace active
          </div>
        </div>

        {isShowingErrorState ? (
          <div className="dashboard-error">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={() => loadDashboard()}>
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
                isLoading={isShowingLoadingState}
              />
              <StatCard
                icon="folder"
                label="Active Projects"
                value={data?.stats.projects.active}
                secondary={`${data?.stats.projects.total ?? 0} total projects`}
                isLoading={isShowingLoadingState}
              />
              <StatCard
                icon="bot"
                label="Agents"
                value={data?.stats.agents.total}
                secondary={`${data?.stats.agents.active ?? 0} currently active`}
                isLoading={isShowingLoadingState}
              />
              <StatCard
                icon="spark"
                label="AI Messages"
                value={data?.stats.messages.total}
                trendPct={data?.stats.messages.trendPct}
                secondary={`${data?.stats.messages.last7Days ?? 0} in the last 7 days`}
                isLoading={isShowingLoadingState}
              />
            </div>

            <div className="dashboard-main-grid">
              <div className="dashboard-column-main">
                <ActivityChart data={data?.usage} isLoading={isShowingLoadingState} />
                <QuickActions />
                <RecentProjects projects={data?.recentProjects} isLoading={isShowingLoadingState} />
              </div>
              <div className="dashboard-column-side">
                <AgentActivity agents={data?.agentActivity} isLoading={isShowingLoadingState} />
                <ActivityFeed items={data?.recentActivity} isLoading={isShowingLoadingState} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard
