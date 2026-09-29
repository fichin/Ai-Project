import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/Button'
import Footer from '../components/Footer'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectCard from '../components/projects/ProjectCard'
import ProjectsToolbar from '../components/projects/ProjectsToolbar'
import ProjectsEmptyState from '../components/projects/ProjectsEmptyState'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import { fetchProjects, createProjectRequest, updateProjectRequest, deleteProjectRequest } from '../components/projects/projectsApi'
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation'
import './Projects.css'

const PROJECTS_QUERY_KEY = ['projects']

function Projects() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  // Retries are disabled app-wide (see lib/queryClient.js) so a failed load
  // shows the error immediately with a manual "Retry" button, rather than
  // TanStack Query's default silent background retries.
  const {
    data: projects = [],
    isLoading,
    isFetching,
    error,
    refetch: loadProjects,
  } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: ({ signal }) => fetchProjects({ signal }),
  })
  const loadError = error?.message ?? null
  // Once a load has failed, `status` (and therefore `error`) stays "error"
  // for the duration of a manual retry — only `isFetching` flips true — so
  // this covers the retry-in-flight case the same way the previous
  // `isLoading` (reset to true on every retry) did.
  const isShowingLoadingState = isLoading || (Boolean(loadError) && isFetching)

  // Cache sync lives in each mutation's own `onSuccess` (below), which only
  // runs after the server confirms the change — so a failed mutation never
  // touches `['projects']` and the cache can't drift from what the server
  // actually has. `mutateAsync` (not `mutate`) is used everywhere here so
  // failures still reject the awaited call, letting useSubmitState /
  // useDeleteConfirmation's existing try/catch surface the error exactly as
  // it did with the raw async calls.
  const createProjectMutation = useMutation({
    mutationFn: (fields) => createProjectRequest(fields),
    onSuccess: (created) => {
      queryClient.setQueryData(PROJECTS_QUERY_KEY, (prev) => [created, ...(prev ?? [])])
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, fields }) => updateProjectRequest(id, fields),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROJECTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((project) => (project.id === updated.id ? updated : project)),
      )
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (project) => deleteProjectRequest(project.id),
    onSuccess: (_data, project) => {
      queryClient.setQueryData(PROJECTS_QUERY_KEY, (prev) => (prev ?? []).filter((p) => p.id !== project.id))
    },
  })

  const {
    pendingItem: deletingProject,
    isDeleting,
    error: deleteError,
    request: handleRequestDelete,
    cancel: handleCancelDelete,
    confirm: handleConfirmDelete,
  } = useDeleteConfirmation(
    (project) => deleteProjectMutation.mutateAsync(project),
    // The cache is already synced by the mutation's own onSuccess above —
    // this hook's onDeleted only needs to exist to satisfy its signature.
    () => {},
  )

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
      await updateProjectMutation.mutateAsync({ id: editingProject.id, fields })
    } else {
      await createProjectMutation.mutateAsync(fields)
    }
    handleCloseForm()
  }

  return (
    <div className="projects-page">
      <div className="projects-container">
        <div className="projects-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">Organize your work and track progress across every AI-driven initiative.</p>
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

        {isShowingLoadingState ? (
          <p className="projects-status-message">Loading projects...</p>
        ) : loadError ? (
          <div className="projects-status-message">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={() => loadProjects()}>
              Retry
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <ProjectsEmptyState onClearFilters={handleClearFilters} />
        ) : (
          <div className="projects-grid">
            <h2 className="sr-only">Project list</h2>
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
