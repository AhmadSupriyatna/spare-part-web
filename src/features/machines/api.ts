import { apiClient } from '@/lib/api-client'
import type { Machine } from '@/types/tasks'

export interface MachinePayload {
  code: string
  name: string
  category?: string | null
  is_active?: boolean
}

export async function fetchMachines(lineId: number): Promise<Machine[]> {
  const { data } = await apiClient.get<{ data: Machine[] }>(`/lines/${lineId}/machines`)
  return data.data
}

export async function fetchMachine(id: number): Promise<Machine> {
  const { data } = await apiClient.get<{ data: Machine }>(`/machines/${id}`)
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

export async function deleteMachine(id: number): Promise<void> {
  await apiClient.delete(`/machines/${id}`)
}

export async function addMachineRuntime(id: number, hours: number): Promise<Machine> {
  const { data } = await apiClient.post<{ data: Machine }>(`/machines/${id}/runtime`, { hours })
  return data.data
}
