import { lazy, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicLayout from './components/layout/PublicLayout'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import RoutePageFallback from './components/RoutePageFallback'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthProvider'
import { PreferencesProvider } from './context/PreferencesProvider'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// The authenticated pages below are only ever reached once a user is logged
// in and past ProtectedRoute, so splitting them into their own chunks keeps
// their code (charts, chat UI, agent/project CRUD, settings) out of the
// bundle every visitor downloads just to see the public Home/Login pages.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Assistant = lazy(() => import('./pages/Assistant'))
const Agents = lazy(() => import('./pages/Agents'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={<RoutePageFallback />}>
                      <Dashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="/assistant"
                  element={
                    <Suspense fallback={<RoutePageFallback />}>
                      <Assistant />
                    </Suspense>
                  }
                />
                <Route
                  path="/agents"
                  element={
                    <Suspense fallback={<RoutePageFallback />}>
                      <Agents />
                    </Suspense>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <Suspense fallback={<RoutePageFallback />}>
                      <Projects />
                    </Suspense>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <Suspense fallback={<RoutePageFallback />}>
                      <ProjectDetails />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Suspense fallback={<RoutePageFallback />}>
                      <Settings />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
