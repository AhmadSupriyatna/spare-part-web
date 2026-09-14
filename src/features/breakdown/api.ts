import { apiClient } from '@/lib/api-client'
import type {
  PublicBranch,
  PublicEquipment,
  PublicLine,
  PublicMachine,
  PublicPart,
  ReplacementRequest,
  ReplacementRequestStatus,
} from '@/types/breakdown'

// --- Public (no auth) — the QR-scan flow ---

export async function fetchPublicPart(partId: number): Promise<PublicPart> {
  const { data } = await apiClient.get<{ data: PublicPart }>(`/public/parts/${partId}`)
  return data.data
}

export async function fetchPublicBranches(): Promise<PublicBranch[]> {
  const { data } = await apiClient.get<{ data: PublicBranch[] }>('/public/branches')
  return data.data
}

export async function fetchPublicLines(branchId: number): Promise<PublicLine[]> {
  const { data } = await apiClient.get<{ data: PublicLine[] }>(`/public/branches/${branchId}/lines`)
  return data.data
}

export async function fetchPublicMachines(lineId: number): Promise<PublicMachine[]> {
  const { data } = await apiClient.get<{ data: PublicMachine[] }>(`/public/lines/${lineId}/machines`)
  return data.data
}

export async function fetchPublicEquipment(machineId: number): Promise<PublicEquipment[]> {
  const { data } = await apiClient.get<{ data: PublicEquipment[] }>(
    `/public/machines/${machineId}/equipment`,
  )
  return data.data
}

/**
 * Only equipment that actually uses this part per its BOM, in this branch —
 * this is what the QR-scan flow shows so a technician never has to hunt
 * through the full Line > Machine > Equipment hierarchy.
 */
export async function fetchEquipmentForPartInBranch(
  partId: number,
  branchId: number,
): Promise<PublicEquipment[]> {
  const { data } = await apiClient.get<{ data: PublicEquipment[] }>(
    `/public/parts/${partId}/branches/${branchId}/equipment`,
  )
  return data.data
}

export interface SubmitReplacementPayload {
  part_id: number
  equipment_id: number
  requested_by_name: string
  quantity_used: number
  reason?: string
}

export async function submitReplacementRequest(
  payload: SubmitReplacementPayload,
): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ data: { id: number } }>(
    '/public/replacement-requests',
    payload,
  )
  return data.data
}

// --- Authenticated — the approval board ---

export async function fetchReplacementRequests(
  branchId: number,
  status?: ReplacementRequestStatus,
): Promise<ReplacementRequest[]> {
  const { data } = await apiClient.get<{ data: ReplacementRequest[] }>(
    `/branches/${branchId}/replacement-requests`,
    { params: status ? { status } : undefined },
  )
  return data.data
}

export async function approveReplacementRequest(
  id: number,
  notes?: string,
): Promise<ReplacementRequest> {
  const { data } = await apiClient.post<{ data: ReplacementRequest }>(
    `/replacement-requests/${id}/approve`,
    { notes },
  )
  return data.data
}

export async function rejectReplacementRequest(
  id: number,
  notes?: string,
): Promise<ReplacementRequest> {
  const { data } = await apiClient.post<{ data: ReplacementRequest }>(
    `/replacement-requests/${id}/reject`,
    { notes },
  )
  return data.data
}
