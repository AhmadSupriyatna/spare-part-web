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

export async function fetchMyTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>('/tasks/mine')
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

export interface CompleteTaskPayload {
  notes?: string
  part_stock_id?: number | null
  quantity_used?: number | null
}

export interface CompleteChecklistPayload {
  notes?: string
  checks: Array<{
    part_id: number
    is_replaced: boolean
    quantity_used?: number | null
    reason?: string | null
  }>
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

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}
