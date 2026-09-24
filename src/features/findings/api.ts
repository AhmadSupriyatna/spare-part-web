import { apiClient } from '@/lib/api-client'
import type { CreateMaintenanceDecisionPayload, MaintenanceDecisionResponse } from '@/types/maintenance-decision'

/**
 * Only ever sends decision/notes/follow_up_* — equipment_id, part_id,
 * event_type, reported_by are never accepted from the client by the backend
 * (MaintenanceDecisionService derives all of that from the Finding itself),
 * so this payload shape can't carry them even by accident.
 */
export async function submitMaintenanceDecision(
  findingId: number,
  payload: CreateMaintenanceDecisionPayload,
): Promise<MaintenanceDecisionResponse> {
  const { data } = await apiClient.post<{ data: MaintenanceDecisionResponse }>(
    `/findings/${findingId}/decision`,
    payload,
  )
  return data.data
}
