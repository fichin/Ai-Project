import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import { STATUS_LABELS } from '../components/projects/projectsData'
import { fetchProject, updateProjectRequest, deleteProjectRequest } from '../components/projects/projectsApi'
import './ProjectDetails.css'

// SQLite's datetime('now') returns UTC timestamps like "2026-09-08 14:06:39"
// (no offset) — same convention already relied on server-side.
function formatDate(value) {
  if (!value) return null
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    setIsLoading(true)
    setNotFound(false)
    setError(null)
    try {
      const data = await fetchProject(id)
      setProject(data)
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true)
      } else {
        setError(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmitEdit(fields) {
    const updated = await updateProjectRequest(project.id, fields)
    setProject(updated)
    setIsFormOpen(false)
  }

  function handleCancelDelete() {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteProjectRequest(project.id)
      navigate('/projects')
    } catch (err) {
      setDeleteError(err.message)
      setIsDeleting(false)
    }
  }

  return (
    <div className="project-details-page">
      <div className="project-details-container">
        <Link to="/projects" className="project-details-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        {isLoading ? (
          <p className="project-details-status-message">Loading project...</p>
        ) : notFound ? (
          <div className="project-details-status-message">
            <h2>Project not found</h2>
            <p>This project doesn&apos;t exist, or you don&apos;t have access to it.</p>
            <Button to="/projects" variant="secondary">
              Back to Projects
            </Button>
          </div>
        ) : error ? (
          <div className="project-details-status-message">
            <p>{error}</p>
            <Button variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="project-details-card">
            <div className="project-details-header">
              <div>
                <h1>{project.name}</h1>
                <div className={`project-details-status project-details-status-${project.status}`}>
                  <span className="status-dot" />
                  {STATUS_LABELS[project.status]}
                </div>
              </div>
              <div className="project-details-actions">
                <Button variant="secondary" onClick={() => setIsFormOpen(true)}>
                  Edit Project
                </Button>
                <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                  Delete Project
                </Button>
              </div>
            </div>

            <p className="project-details-description">{project.description || 'No description provided.'}</p>

            <div className="project-details-meta">
              <div className="project-details-meta-item">
                <span className="project-details-meta-label">Project ID</span>
                <span className="project-details-meta-value">#{project.id}</span>
              </div>
              <div className="project-details-meta-item">
                <span className="project-details-meta-label">Created</span>
                <span className="project-details-meta-value">{formatDate(project.createdAt) ?? '—'}</span>
              </div>
              <div className="project-details-meta-item">
                <span className="project-details-meta-label">Last updated</span>
                <span className="project-details-meta-value">{formatDate(project.updatedAt) ?? '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <ProjectFormModal project={project} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmitEdit} />
      )}

      {isDeleteOpen && (
        <ConfirmDialog
          title="Delete project"
          message={`Are you sure you want to delete "${project.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          isSubmitting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}

export default ProjectDetails
