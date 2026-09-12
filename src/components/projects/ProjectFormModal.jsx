import { useState } from 'react'
import Modal from '../Modal'
import Button from '../Button'
import { STATUS_LABELS } from './projectsData'
import './ProjectFormModal.css'

function ProjectFormModal({ project, onClose, onSubmit }) {
  const isEditing = Boolean(project)
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState(project?.status ?? 'planning')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (name.trim().length === 0) {
      setError('Project name is required.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), description, status })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={isEditing ? 'Edit Project' : 'New Project'} onClose={onClose} closeOnOverlayClick={!isSubmitting}>
      <form className="project-form" onSubmit={handleSubmit}>
        {error && <p className="project-form-error">{error}</p>}

        <label className="project-form-field">
          Project name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Customer Insights Copilot"
            autoFocus
            required
          />
        </label>

        <label className="project-form-field">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this project about?"
            rows={4}
          />
        </label>

        <label className="project-form-field">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {Object.keys(STATUS_LABELS).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <div className="project-form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ProjectFormModal
