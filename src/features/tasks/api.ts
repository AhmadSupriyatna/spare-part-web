import { apiClient } from '@/lib/api-client'
import type { Task } from '@/types/tasks'

export interface TaskPayload {
  title: string
  description?: string | null
  cause?: string | null
  assigned_to?: number | null
  due_date?: string | null
  part_stock_id?: number | null
  quantity_used?: number | null
}

export async function fetchTasksForEquipment(equipmentId: number): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>(`/equipment/${equipmentId}/tasks`)
  return data.data
}

export async function fetchTask(id: number): Promise<Task> {
  const { data } = await apiClient.get<{ data: Task }>(`/tasks/${id}`)
  return data.data
}

export async function fetchMyTasks(branchId: number | null): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>('/tasks/mine', {
    params: { branch_id: branchId ?? undefined },
  })
  return data.data
}

/**
 * Every task ever scheduled from a Task Library, across the branch — backs
 * both the WO Ledger tab and the PM calendar.
 */
export async function fetchPmTasksForBranch(branchId: number): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>(`/branches/${branchId}/pm-tasks`)
  return data.data
}

export async function createTask(equipmentId: number, payload: TaskPayload): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/equipment/${equipmentId}/tasks`, payload)
  return data.data
}

export async function updateTask(id: number, payload: Partial<TaskPayload>): Promise<Task> {
  const { data } = await apiClient.put<{ data: Task }>(`/tasks/${id}`, payload)
  return data.data
}

export async function startTask(id: number): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/tasks/${id}/start`)
  return data.data
}

/** Independent of checks/part_stock_id below — a task can carry both a part checklist and checklist items, or (checklist-only) just this. */
export interface CompleteChecklistItemInput {
  id: number
  condition_ok: boolean
  notes?: string | null
}

export interface CompleteTaskPayload {
  notes?: string
  part_stock_id?: number | null
  quantity_used?: number | null
  checklist_items?: CompleteChecklistItemInput[]
}

export interface CompleteChecklistPayload {
  notes?: string
  checks: Array<{
    id: number
    part_id: number
    is_replaced: boolean
    quantity_used?: number | null
    reason?: string | null
    part_unit_id?: number | null
    old_installation_id?: number | null
  }>
  checklist_items?: CompleteChecklistItemInput[]
}

export async function completeTask(
  id: number,
  payload: CompleteTaskPayload | CompleteChecklistPayload,
): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/tasks/${id}/complete`, payload)
  return data.data
}

export async function cancelTask(id: number, notes?: string): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/tasks/${id}/cancel`, { notes })
  return data.data
}

export async function rescheduleTask(id: number, dueDate: string, reason?: string): Promise<Task> {
  const { data } = await apiClient.put<{ data: Task }>(`/tasks/${id}/reschedule`, {
    due_date: dueDate,
    reason: reason || undefined,
  })
  return data.data
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}
