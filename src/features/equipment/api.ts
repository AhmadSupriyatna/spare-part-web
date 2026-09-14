import { apiClient } from '@/lib/api-client'
import type { Equipment } from '@/types/tasks'

export interface EquipmentPayload {
  code: string
  name: string
  category?: string | null
  is_active?: boolean
}

export async function fetchEquipmentList(machineId: number): Promise<Equipment[]> {
  const { data } = await apiClient.get<{ data: Equipment[] }>(`/machines/${machineId}/equipment`)
  return data.data
}

export async function fetchEquipmentForBranch(branchId: number): Promise<Equipment[]> {
  const { data } = await apiClient.get<{ data: Equipment[] }>(`/branches/${branchId}/equipment`)
  return data.data
}

export async function fetchEquipment(id: number): Promise<Equipment> {
  const { data } = await apiClient.get<{ data: Equipment }>(`/equipment/${id}`)
  return data.data
}

export async function createEquipment(machineId: number, payload: EquipmentPayload): Promise<Equipment> {
  const { data } = await apiClient.post<{ data: Equipment }>(`/machines/${machineId}/equipment`, payload)
  return data.data
}

export async function updateEquipment(id: number, payload: Partial<EquipmentPayload>): Promise<Equipment> {
  const { data } = await apiClient.put<{ data: Equipment }>(`/equipment/${id}`, payload)
  return data.data
}

export async function deleteEquipment(id: number): Promise<void> {
  await apiClient.delete(`/equipment/${id}`)
}
