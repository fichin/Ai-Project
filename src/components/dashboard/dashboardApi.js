import { apiRequest } from '../../lib/apiClient'

export function fetchDashboardSummary() {
  return apiRequest('/api/dashboard/summary')
}
