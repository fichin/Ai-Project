import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../Modal'
import Button from '../Button'
import { STATUS_LABELS } from './agentsData'
import { required } from '../../lib/validation'
import { useSubmitState } from '../../hooks/useSubmitState'
import './AgentFormModal.css'

// Create/edit share this one form, same pattern as ProjectFormModal:
// `agent` present -> edit mode, absent -> create mode. `lockedProjectId` is
// set when opened from within a Project's own page (ProjectDetails) — the
// agent is pinned to that project instead of offering the full picker.
function AgentFormModal({ agent, projects = [], lockedProjectId, lockedProjectName, onClose, onSubmit }) {
  const isEditing = Boolean(agent)
  const isProjectLocked = lockedProjectId !== undefined && lockedProjectId !== null

  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [status, setStatus] = useState(agent?.status ?? 'draft')
  const [projectId, setProjectId] = useState(() => {
    if (isProjectLocked) return String(lockedProjectId)
    return agent?.projectId ? String(agent.projectId) : ''
  })
  const { error, setError, isSubmitting, submit } = useSubmitState()

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = required(name, 'Agent name is required.')
    if (validationError) {
      setError(validationError)
      return
    }

    await submit(() =>
      onSubmit({
        name: name.trim(),
        description,
        status,
        project_id: projectId === '' ? null : Number(projectId),
      }),
    )
  }

  return (
    <Modal title={isEditing ? 'Edit Agent' : 'New Agent'} onClose={onClose} closeOnOverlayClick={!isSubmitting}>
      <form className="agent-form" onSubmit={handleSubmit}>
        {error && <p className="agent-form-error">{error}</p>}

        <label className="agent-form-field">
          Agent name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Support Triage Agent"
            autoFocus
            required
          />
        </label>

        <label className="agent-form-field">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this agent responsible for?"
            rows={4}
          />
        </label>

        <label className="agent-form-field">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {Object.keys(STATUS_LABELS).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="agent-form-field">
          Project
          {isProjectLocked ? (
            <div className="agent-form-locked-project">{lockedProjectName}</div>
          ) : (
            <>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="agent-form-hint">
                  You don&apos;t have any projects yet — this agent can stay unassigned, or{' '}
                  <Link to="/projects" onClick={onClose}>
                    create a project
                  </Link>{' '}
                  first.
                </p>
              )}
            </>
          )}
        </label>

        <div className="agent-form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AgentFormModal
