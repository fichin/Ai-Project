// Static presentation data for the public marketing Home page only.
// Nothing here is fetched from the API or persisted — it exists purely to
// render realistic-looking product previews (dashboard, chat, agents) for
// logged-out visitors. Do not wire these into real endpoints; the actual
// data lives behind auth on /dashboard, /projects, /agents, /assistant.

export const heroStats = [
  { icon: 'chat', label: 'AI Conversations', value: 1284, trendPct: 12, secondary: '86 in the last 7 days' },
  { icon: 'folder', label: 'Active Projects', value: 12, secondary: '18 total projects' },
  { icon: 'bot', label: 'Agents', value: 7, secondary: '5 currently active' },
  { icon: 'spark', label: 'AI Messages', value: 4820, trendPct: 18, secondary: '640 in the last 7 days' },
]

// 14 days of synthetic usage counts, shaped like the real /dashboard payload
// (ActivityChart just needs { date, count }[]).
export const usageData = [18, 26, 22, 34, 29, 41, 38, 52, 47, 60, 55, 68, 61, 74].map((count, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (13 - index))
  return { date: date.toISOString().slice(0, 10), count }
})

export const recentProjects = [
  { id: 'p1', name: 'Research Intelligence', status: 'active', agentCount: 3, lastUpdated: '2h ago' },
  { id: 'p2', name: 'Pricing Intelligence', status: 'active', agentCount: 2, lastUpdated: '5h ago' },
  { id: 'p3', name: 'Content Pipeline', status: 'planning', agentCount: 1, lastUpdated: '1d ago' },
]

export const agentActivity = [
  { id: 'a1', name: 'Research Agent', status: 'active', projectName: 'Research Intelligence', lastUpdated: '2h ago' },
  { id: 'a2', name: 'Analysis Agent', status: 'active', projectName: 'Pricing Intelligence', lastUpdated: '5h ago' },
  { id: 'a3', name: 'Support Agent', status: 'paused', projectName: 'Content Pipeline', lastUpdated: '1d ago' },
]

export const assistantExchange = {
  user: 'Analyze this project and suggest improvements.',
  bullets: [
    'Automate the weekly research summary',
    'Reassign idle tasks to the Analysis Agent',
    'Add a review step before publishing',
  ],
}

export const projectAgentFlows = [
  {
    id: 'f1',
    projectName: 'Research Intelligence',
    agentName: 'Research Agent',
    agentIcon: 'research',
    status: 'active',
  },
  {
    id: 'f2',
    projectName: 'Pricing Intelligence',
    agentName: 'Analysis Agent',
    agentIcon: 'chart',
    status: 'active',
  },
]

export const commandItems = {
  navigate: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', active: true },
    { id: 'assistant', label: 'AI Assistant', icon: 'assistant' },
    { id: 'projects', label: 'Projects', icon: 'projects' },
    { id: 'agents', label: 'Agents', icon: 'agents' },
  ],
  actions: [
    { id: 'new-project', label: 'New Project' },
    { id: 'new-agent', label: 'New Agent' },
  ],
}

export const workspaceFeatures = [
  { icon: 'assistant', title: 'AI Assistant', description: 'Converse, plan and execute.' },
  { icon: 'projects', title: 'Projects', description: 'Organize every initiative.' },
  { icon: 'agents', title: 'Agents', description: 'Autonomous execution at scale.' },
  { icon: 'command', title: 'Command Center', description: 'Instant control, anywhere.' },
]

export const coreLabels = [
  { id: 'engine', label: 'AI ENGINE', top: '6%', left: '2%', primary: true },
  { id: 'projects', label: 'PROJECTS', top: '4%', left: '68%', primary: false },
  { id: 'agents', label: 'AGENTS', top: '80%', left: '0%', primary: true },
  { id: 'workflows', label: 'WORKFLOWS', top: '84%', left: '66%', primary: false },
]
