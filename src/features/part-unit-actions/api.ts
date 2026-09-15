import { apiClient } from '@/lib/api-client'
import type {
  PartUnitAction,
  PartUnitActionRequest,
  PartUnitActionRequestStatus,
  PublicPartUnit,
} from '@/types/part-unit-actions'

// --- Public (no auth) — the QR-per-unit scan flow ---

export async function fetchPublicPartUnit(unitId: number): Promise<PublicPartUnit> {
  const { data } = await apiClient.get<{ data: PublicPartUnit }>(`/public/part-units/${unitId}`)
  return data.data
}

export interface SubmitPartUnitActionPayload {
  action: PartUnitAction
  requested_by_name: string
  equipment_id?: number | null
  notes?: string
}

export async function submitPartUnitActionRequest(
  unitId: number,
  payload: SubmitPartUnitActionPayload,
): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ data: { id: number } }>(
    `/public/part-units/${unitId}/action-requests`,
    payload,
  )
  return data.data
}

// --- Authenticated — the approval board ---

export async function fetchPartUnitActionRequests(
  branchId: number,
  status?: PartUnitActionRequestStatus,
): Promise<PartUnitActionRequest[]> {
  const { data } = await apiClient.get<{ data: PartUnitActionRequest[] }>(
    `/branches/${branchId}/part-unit-action-requests`,
    { params: status ? { status } : undefined },
  )
  return data.data
}

export async function approvePartUnitActionRequest(
  id: number,
  notes?: string,
): Promise<PartUnitActionRequest> {
  const { data } = await apiClient.post<{ data: PartUnitActionRequest }>(
    `/part-unit-action-requests/${id}/approve`,
    { notes },
  )
  return data.data
}

export async function rejectPartUnitActionRequest(
  id: number,
  notes?: string,
): Promise<PartUnitActionRequest> {
  const { data } = await apiClient.post<{ data: PartUnitActionRequest }>(
    `/part-unit-action-requests/${id}/reject`,
    { notes },
  )
  return data.data
}
