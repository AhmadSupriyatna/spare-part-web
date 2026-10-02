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

/**
 * Laporan Pemeriksaan Mesin — every WO under this Machine (regular PM or
 * Part Lifetime auto-scheduled) due within [from, to]. Purely a read-time
 * grouping — see TaskController::woReportForMachine().
 */
export async function fetchWoReportForMachine(machineId: number, from: string, to: string): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>(`/machines/${machineId}/wo-report`, {
    params: { from, to },
  })
  return data.data
}

// --- "Monitoring Life Time Mesin" (public QR-scan landing page) ---

export interface MonthlyConsumption {
  month: string
  quantity: number
  /** Only present on the authenticated summary — never on the public monitoring payload. */
  cost?: string
}

export interface TopPartConsumed {
  part_id: number
  part_name: string
  item_master_no: string
  quantity: number
  /** Only present on the authenticated summary — never on the public monitoring payload. */
  cost?: string
}

export interface MachineMonitoringData {
  machine: Machine
  equipment_count: number
  upcoming_tasks: Task[]
  overdue_task_count: number
  installations: PartInstallation[]
  monthly_failure_trend: { month: string; count: number }[]
  average_lifetime_hours: number | null
  monthly_consumption_trend: MonthlyConsumption[]
  top_parts_consumed: TopPartConsumed[]
}

/** Unauthenticated — see PublicMachineMonitoringController. Reached by scanning a Machine's printed QR, no login. */
export async function fetchMachineMonitoring(machineId: number): Promise<MachineMonitoringData> {
  const { data } = await apiClient.get<{ data: MachineMonitoringData }>(`/public/machines/${machineId}/monitoring`)
  return data.data
}

// --- Machine Detail (authenticated menu page) ---

export interface MachineSummaryData extends MachineMonitoringData {
  /** Current branch unit_cost x active installation count, summed — cost fields only ever appear here, never on the public endpoint. */
  installed_part_value: string
}

export async function fetchMachineSummary(machineId: number): Promise<MachineSummaryData> {
  const { data } = await apiClient.get<{ data: MachineSummaryData }>(`/machines/${machineId}/summary`)
  return data.data
}
