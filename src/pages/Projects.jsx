import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Footer from '../components/Footer'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectCard from '../components/projects/ProjectCard'
import ProjectsToolbar from '../components/projects/ProjectsToolbar'
import ProjectsEmptyState from '../components/projects/ProjectsEmptyState'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import { fetchProjects, createProjectRequest, updateProjectRequest, deleteProjectRequest } from '../components/projects/projectsApi'
import './Projects.css'

function Projects() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  const [deletingProject, setDeletingProject] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.description.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [projects, search, statusFilter])

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('all')
  }

  function handleOpenCreateForm() {
    setEditingProject(null)
    setIsFormOpen(true)
  }

  function handleOpenEditForm(project) {
    setEditingProject(project)
    setIsFormOpen(true)
  }

  function handleCloseForm() {
    setIsFormOpen(false)
    setEditingProject(null)
  }

  async function handleSubmitForm(fields) {
    if (editingProject) {
      const updated = await updateProjectRequest(editingProject.id, fields)
      setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)))
    } else {
      const created = await createProjectRequest(fields)
      setProjects((prev) => [created, ...prev])
    }
    handleCloseForm()
  }

  function handleRequestDelete(project) {
    setDeleteError(null)
    setDeletingProject(project)
  }

  function handleCancelDelete() {
    if (isDeleting) return
    setDeletingProject(null)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteProjectRequest(deletingProject.id)
      setProjects((prev) => prev.filter((project) => project.id !== deletingProject.id))
      setDeletingProject(null)
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="projects-page">
      <div className="projects-container">
        <div className="projects-header">
          <div>
            <h1>Projects</h1>
            <p>Organize your work and track progress across every AI-driven initiative.</p>
          </div>
          <Button variant="primary" onClick={handleOpenCreateForm}>
            + New Project
          </Button>
        </div>

        <ProjectsToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {isLoading ? (
          <p className="projects-status-message">Loading projects...</p>
        ) : loadError ? (
          <div className="projects-status-message">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={loadProjects}>
              Retry
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <ProjectsEmptyState onClearFilters={handleClearFilters} />
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleOpenEditForm}
                onDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />

      {isFormOpen && (
        <ProjectFormModal project={editingProject} onClose={handleCloseForm} onSubmit={handleSubmitForm} />
      )}

      {deletingProject && (
        <ConfirmDialog
          title="Delete project"
          message={`Are you sure you want to delete "${deletingProject.name}"? This cannot be undone.`}
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

export default Projects
