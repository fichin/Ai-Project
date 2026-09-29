// Static commands shown in the palette's browse mode (empty query) and
// matched by label once the user types. Handlers are injected by
// CommandPalette so this file stays free of routing/auth/context concerns.
export function getStaticCommandGroups({ navigate, onToggleSidebar, onOpenActivity, onLogout }) {
  return [
    {
      id: 'navigation',
      label: 'Navigation',
      items: [
        { id: 'nav-dashboard', label: 'Dashboard', onSelect: () => navigate('/dashboard') },
        { id: 'nav-assistant', label: 'AI Assistant', onSelect: () => navigate('/assistant') },
        { id: 'nav-agents', label: 'Agents', onSelect: () => navigate('/agents') },
        { id: 'nav-projects', label: 'Projects', onSelect: () => navigate('/projects') },
        { id: 'nav-settings', label: 'Settings', onSelect: () => navigate('/settings') },
      ],
    },
    {
      id: 'create',
      label: 'Create',
      items: [
        { id: 'create-project', label: 'New Project', description: 'Go to Projects to create one', onSelect: () => navigate('/projects') },
        { id: 'create-agent', label: 'New Agent', description: 'Go to Agents to create one', onSelect: () => navigate('/agents') },
      ],
    },
    {
      id: 'actions',
      label: 'Actions',
      items: [
        { id: 'action-toggle-sidebar', label: 'Toggle Sidebar', onSelect: onToggleSidebar },
        { id: 'action-activity', label: 'View Activity', onSelect: onOpenActivity },
        { id: 'action-settings', label: 'Open Settings', onSelect: () => navigate('/settings') },
        { id: 'action-logout', label: 'Log out', onSelect: onLogout, isDanger: true },
      ],
    },
  ]
}
