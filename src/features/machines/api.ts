import { apiClient } from '@/lib/api-client'
import type { Machine } from '@/types/tasks'

/** No `code` — it's system-generated from `name` server-side (see Machine::generateCode()), never client-supplied. */
export interface MachinePayload {
  name: string
  category?: string | null
  is_active?: boolean
}

export async function fetchMachines(lineId: number): Promise<Machine[]> {
  const { data } = await apiClient.get<{ data: Machine[] }>(`/lines/${lineId}/machines`)
  return data.data
}

export async function createMachine(lineId: number, payload: MachinePayload): Promise<Machine> {
  const { data } = await apiClient.post<{ data: Machine }>(`/lines/${lineId}/machines`, payload)
  return data.data
}

export async function updateMachine(id: number, payload: Partial<MachinePayload>): Promise<Machine> {
  const { data } = await apiClient.put<{ data: Machine }>(`/machines/${id}`, payload)
  return data.data
}

export async function deleteMachine(id: number, password: string): Promise<void> {
  await apiClient.delete(`/machines/${id}`, { data: { password } })
}

// --- "Mesin Luar Line" ---

/** No `line_id` (there is none) and no `code` — system-generated from `name`, same policy as production Machine. */
export interface OutsideLineMachinePayload {
  name: string
  category?: string | null
  is_active?: boolean
}

export async function fetchOutsideLineMachines(branchId: number): Promise<Machine[]> {
  const { data } = await apiClient.get<{ data: Machine[] }>(`/branches/${branchId}/machines`)
  return data.data
}

export async function createOutsideLineMachine(
  branchId: number,
  payload: OutsideLineMachinePayload,
): Promise<Machine> {
  const { data } = await apiClient.post<{ data: Machine }>(`/branches/${branchId}/machines`, payload)
  return data.data
}
