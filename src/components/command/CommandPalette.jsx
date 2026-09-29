import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStaticCommandGroups } from './commands'
import { fetchProjects } from '../projects/projectsApi'
import { fetchAgents } from '../agents/agentsApi'
import Icon from '../icons/Icon'
import './CommandPalette.css'

// Global Ctrl+K / Cmd+K command center. Mounted once inside AppShell (see
// AppShell.jsx), so it only ever exists on authenticated routes — the
// public Home page never renders it. Navigation/search results all go
// through the same fetchProjects/fetchAgents calls the Projects/Agents
// pages already use, so results are inherently scoped to the current user
// and never include another user's data.
function CommandPalette({ isOpen, onClose, onToggleSidebar, onOpenActivity, onLogout }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [projects, setProjects] = useState([])
  const [agents, setAgents] = useState([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function loadSearchData() {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)

      setIsSearchLoading(true)
      try {
        const [projectsData, agentsData] = await Promise.all([fetchProjects(), fetchAgents()])
        if (cancelled) return
        setProjects(projectsData)
        setAgents(agentsData)
      } catch {
        // A failed search fetch just means Navigation/Create/Actions still
        // work — not worth blocking the whole palette over.
      } finally {
        if (!cancelled) setIsSearchLoading(false)
      }
    }

    loadSearchData()

    return () => {
      cancelled = true
    }
  }, [isOpen])

  function goTo(path, state) {
    navigate(path, state ? { state } : undefined)
    onClose()
  }

  function handleToggleSidebar() {
    onToggleSidebar()
    onClose()
  }

  function handleOpenActivity() {
    onOpenActivity()
    onClose()
  }

  async function handleLogout() {
    onClose()
    await onLogout()
  }

  const groups = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const staticGroups = getStaticCommandGroups({
      navigate: goTo,
      onToggleSidebar: handleToggleSidebar,
      onOpenActivity: handleOpenActivity,
      onLogout: handleLogout,
    })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(trimmed)),
      }))
      .filter((group) => group.items.length > 0)

    if (!trimmed) return staticGroups

    const projectItems = projects
      .filter((project) => project.name.toLowerCase().includes(trimmed))
      .slice(0, 5)
      .map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        description: 'Project',
        onSelect: () => goTo(`/projects/${project.id}`),
      }))

    const agentItems = agents
      .filter((agent) => agent.name.toLowerCase().includes(trimmed))
      .slice(0, 5)
      .map((agent) => ({
        id: `agent-${agent.id}`,
        label: agent.name,
        description: agent.projectName ? `Agent · ${agent.projectName}` : 'Agent',
        onSelect: () => goTo('/agents', { presetSearch: agent.name }),
      }))

    const searchGroups = []
    if (projectItems.length > 0) searchGroups.push({ id: 'search-projects', label: 'Projects', items: projectItems })
    if (agentItems.length > 0) searchGroups.push({ id: 'search-agents', label: 'Agents', items: agentItems })

    return [...staticGroups, ...searchGroups]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, projects, agents])

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups])
  // Derived, not stored: the raw `activeIndex` state can point past the end
  // once the result count shrinks (e.g. a more specific query), so every
  // read clamps it instead of needing a correcting effect.
  const safeActiveIndex = flatItems.length === 0 ? 0 : Math.min(activeIndex, flatItems.length - 1)
  const activeItemId = flatItems[safeActiveIndex] ? `command-palette-option-${flatItems[safeActiveIndex].id}` : undefined

  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [safeActiveIndex])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(flatItems.length === 0 ? 0 : (safeActiveIndex + 1) % flatItems.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(flatItems.length === 0 ? 0 : (safeActiveIndex - 1 + flatItems.length) % flatItems.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      flatItems[safeActiveIndex]?.onSelect()
    }
  }

  if (!isOpen) return null

  let runningIndex = -1

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-search">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search or jump to..."
            aria-label="Command palette search"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={activeItemId}
            autoComplete="off"
          />
          <kbd className="command-palette-esc">Esc</kbd>
          <button
            type="button"
            className="command-palette-close"
            onClick={onClose}
            aria-label="Close search"
            title="Close search"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div
          className="command-palette-results"
          ref={listRef}
          id="command-palette-listbox"
          role="listbox"
          aria-label="Command palette results"
        >
          {flatItems.length === 0 ? (
            <div className="command-palette-empty">
              {isSearchLoading ? 'Loading...' : `No results for "${query}"`}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="command-palette-group">
                <div className="command-palette-group-label">{group.label}</div>
                {group.items.map((item) => {
                  runningIndex += 1
                  const index = runningIndex
                  const isActive = index === safeActiveIndex
                  return (
                    <button
                      key={item.id}
                      id={`command-palette-option-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive ? 'true' : undefined}
                      className={`command-palette-item ${isActive ? 'command-palette-item-active' : ''} ${
                        item.isDanger ? 'command-palette-item-danger' : ''
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => item.onSelect()}
                    >
                      <span className="command-palette-item-label">{item.label}</span>
                      {item.description && (
                        <span className="command-palette-item-description">{item.description}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
