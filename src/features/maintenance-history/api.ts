import { apiClient } from '@/lib/api-client'
import type { MaintenanceHistoryEntry, MaintenanceHistoryFilters } from '@/types/maintenance-history'

export async function fetchMaintenanceHistory(
  branchId: number,
  filters: MaintenanceHistoryFilters = {},
): Promise<MaintenanceHistoryEntry[]> {
  const { data } = await apiClient.get<{ data: MaintenanceHistoryEntry[] }>(
    `/branches/${branchId}/maintenance-history`,
    { params: filters },
  )
  return data.data
}
