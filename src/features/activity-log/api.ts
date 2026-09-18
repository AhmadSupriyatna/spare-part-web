import { apiClient } from '@/lib/api-client'

export interface ActivityChange {
  field: string
  old: unknown
  new: unknown
}

export interface ActivityLogEntry {
  id: number
  event: 'created' | 'updated' | 'deleted' | string
  subject_type: string
  subject_label: string
  subject_id: number
  subject_display: string | null
  causer_name: string | null
  description: string
  changes: ActivityChange[]
  created_at: string
}

export interface ActivityLogFilters {
  from?: string
  to?: string
}

export async function fetchActivityLog(branchId: number, filters: ActivityLogFilters): Promise<ActivityLogEntry[]> {
  const { data } = await apiClient.get<{ data: ActivityLogEntry[] }>(`/branches/${branchId}/activity-log`, {
    params: filters,
  })
  return data.data
}
