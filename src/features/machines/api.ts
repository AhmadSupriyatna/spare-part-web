import { apiClient } from '@/lib/api-client'
import type { Machine, Task } from '@/types/tasks'
import type { PartInstallation } from '@/types/relations'

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

// --- "Monitoring Life Time Mesin" (public QR-scan landing page) ---

export interface MachineMonitoringData {
  machine: Machine
  equipment_count: number
  upcoming_tasks: Task[]
  overdue_task_count: number
  installations: PartInstallation[]
  monthly_failure_trend: { month: string; count: number }[]
  average_lifetime_hours: number | null
}

/** Unauthenticated — see PublicMachineMonitoringController. Reached by scanning a Machine's printed QR, no login. */
export async function fetchMachineMonitoring(machineId: number): Promise<MachineMonitoringData> {
  const { data } = await apiClient.get<{ data: MachineMonitoringData }>(`/public/machines/${machineId}/monitoring`)
  return data.data
}
