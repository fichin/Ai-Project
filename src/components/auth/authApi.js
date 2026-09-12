import { apiRequest } from '../../lib/apiClient'

export function fetchCurrentUser() {
  return apiRequest('/api/auth/me')
}

export function loginRequest(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export function registerRequest(email, password, name) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
}

export function logoutRequest() {
  return apiRequest('/api/auth/logout', { method: 'POST' })
}

export function updateProfileRequest(fields) {
  return apiRequest('/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

export function verifyEmailRequest(token) {
  return apiRequest('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

export function resendVerificationRequest(email) {
  return apiRequest('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export function forgotPasswordRequest(email) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export function resetPasswordRequest(token, password) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
}

export function fetchDevOutbox(email) {
  return apiRequest(`/api/dev/outbox?to=${encodeURIComponent(email)}`)
}
