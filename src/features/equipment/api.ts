import { apiClient } from '@/lib/api-client'
import type { Equipment } from '@/types/tasks'

/** No `code` — it's system-generated from `name` server-side (see Equipment::generateCode()), never client-supplied. */
export interface EquipmentPayload {
  name: string
  category?: string | null
  is_active?: boolean
}

export async function fetchEquipmentList(machineId: number): Promise<Equipment[]> {
  const { data } = await apiClient.get<{ data: Equipment[] }>(`/machines/${machineId}/equipment`)
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

export async function deleteEquipment(id: number, password: string): Promise<void> {
  await apiClient.delete(`/equipment/${id}`, { data: { password } })
}

// --- Phase 3B "Asset Outside Line" ---

/** No `machine_id` (there is none) and no `code` — system-generated from `name`, same policy as production Equipment. */
export interface OutsideLineEquipmentPayload {
  name: string
  category?: string | null
  is_active?: boolean
}

export async function fetchOutsideLineEquipment(branchId: number): Promise<Equipment[]> {
  const { data } = await apiClient.get<{ data: Equipment[] }>(`/branches/${branchId}/equipment`)
  return data.data
}

export async function createOutsideLineEquipment(
  branchId: number,
  payload: OutsideLineEquipmentPayload,
): Promise<Equipment> {
  const { data } = await apiClient.post<{ data: Equipment }>(`/branches/${branchId}/equipment`, payload)
  return data.data
}
