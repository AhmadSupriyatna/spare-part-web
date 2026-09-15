import { apiClient } from '@/lib/api-client'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'

export async function fetchPartRepairs(disposition?: PartRepairDisposition): Promise<PartRepair[]> {
  const { data } = await apiClient.get<{ data: PartRepair[] }>('/part-repairs', {
    params: disposition ? { disposition } : undefined,
  })
  return data.data
}

export interface CreatePartRepairPayload {
  part_installation_id?: number | null
  notes?: string | null
}

export async function createPartRepair(
  partUnitId: number,
  payload: CreatePartRepairPayload,
): Promise<PartRepair> {
  const { data } = await apiClient.post<{ data: PartRepair }>(`/part-units/${partUnitId}/repairs`, payload)
  return data.data
}

export interface UpdatePartRepairPayload {
  disposition: PartRepairDisposition
  notes?: string | null
}

export async function updatePartRepair(id: number, payload: UpdatePartRepairPayload): Promise<PartRepair> {
  const { data } = await apiClient.put<{ data: PartRepair }>(`/part-repairs/${id}`, payload)
  return data.data
}
