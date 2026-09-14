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

export async function fetchMyTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>('/tasks/mine')
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

export async function completeTask(id: number, notes?: string): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/tasks/${id}/complete`, { notes })
  return data.data
}

export async function cancelTask(id: number, notes?: string): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/tasks/${id}/cancel`, { notes })
  return data.data
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}
