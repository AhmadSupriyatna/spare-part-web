import { apiClient } from '@/lib/api-client'
import type { PartInstallation } from '@/types/relations'
import type { Task } from '@/types/tasks'

export async function fetchPartLifetimeAlerts(branchId: number): Promise<PartInstallation[]> {
  const { data } = await apiClient.get<{ data: PartInstallation[] }>(
    `/branches/${branchId}/part-lifetime-alerts`,
  )
  return data.data
}

export interface ScheduleLifetimeReplacementPayload {
  due_date: string
  assigned_to?: number | null
}

export async function scheduleLifetimeReplacement(
  installationId: number,
  payload: ScheduleLifetimeReplacementPayload,
): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(
    `/part-installations/${installationId}/schedule-replacement`,
    payload,
  )
  return data.data
}
