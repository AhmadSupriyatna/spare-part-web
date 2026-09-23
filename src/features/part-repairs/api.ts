import { apiClient } from '@/lib/api-client'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'

export async function fetchPartRepairs(branchId: number, disposition?: PartRepairDisposition): Promise<PartRepair[]> {
  const { data } = await apiClient.get<{ data: PartRepair[] }>('/part-repairs', {
    params: { branch_id: branchId, disposition },
  })
  return data.data
}

export interface UpdatePartRepairPayload {
  disposition: PartRepairDisposition
  estimated_completion_date?: string | null
  repair_cost?: number | null
  notes?: string | null
}

export async function updatePartRepair(id: number, payload: UpdatePartRepairPayload): Promise<PartRepair> {
  const { data } = await apiClient.put<{ data: PartRepair }>(`/part-repairs/${id}`, payload)
  return data.data
}

/** Superadmin-only: undo a mistaken "Lepas" entirely — see PartLifecycleService::undoRemoval(). */
export async function deletePartRepair(id: number): Promise<void> {
  await apiClient.delete(`/part-repairs/${id}`)
}
