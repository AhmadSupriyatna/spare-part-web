import { apiClient } from '@/lib/api-client'
import type { PartUnit } from '@/types/relations'

export async function fetchUnitsForPart(partId: number): Promise<PartUnit[]> {
  const { data } = await apiClient.get<{ data: PartUnit[] }>(`/parts/${partId}/units`)
  return data.data
}

export async function fetchPartUnit(id: number): Promise<PartUnit> {
  const { data } = await apiClient.get<{ data: PartUnit }>(`/part-units/${id}`)
  return data.data
}
