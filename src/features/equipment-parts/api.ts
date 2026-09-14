import { apiClient } from '@/lib/api-client'
import type { EquipmentPart } from '@/types/relations'

export interface EquipmentPartPayload {
  part_id: number
  quantity_required?: number | null
  notes?: string | null
}

export async function fetchEquipmentParts(equipmentId: number): Promise<EquipmentPart[]> {
  const { data } = await apiClient.get<{ data: EquipmentPart[] }>(`/equipment/${equipmentId}/parts`)
  return data.data
}

export async function fetchEquipmentForPart(partId: number): Promise<EquipmentPart[]> {
  const { data } = await apiClient.get<{ data: EquipmentPart[] }>(`/parts/${partId}/equipment`)
  return data.data
}

export async function addEquipmentPart(
  equipmentId: number,
  payload: EquipmentPartPayload,
): Promise<EquipmentPart> {
  const { data } = await apiClient.post<{ data: EquipmentPart }>(`/equipment/${equipmentId}/parts`, payload)
  return data.data
}

export async function removeEquipmentPart(id: number): Promise<void> {
  await apiClient.delete(`/equipment-parts/${id}`)
}
