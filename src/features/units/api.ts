import { apiClient } from '@/lib/api-client'
import type { Unit } from '@/types/inventory'

export interface UnitPayload {
  name: string
}

export async function fetchUnits(): Promise<Unit[]> {
  const { data } = await apiClient.get<{ data: Unit[] }>('/units')
  return data.data
}

export async function createUnit(payload: UnitPayload): Promise<Unit> {
  const { data } = await apiClient.post<{ data: Unit }>('/units', payload)
  return data.data
}

export async function updateUnit(id: number, payload: UnitPayload): Promise<Unit> {
  const { data } = await apiClient.put<{ data: Unit }>(`/units/${id}`, payload)
  return data.data
}

export async function deleteUnit(id: number): Promise<void> {
  await apiClient.delete(`/units/${id}`)
}
