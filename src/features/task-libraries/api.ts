import { apiClient } from '@/lib/api-client'
import type { TaskLibrary, TaskLibraryPart, TaskLibraryScheduleType } from '@/types/pm'
import type { Task } from '@/types/tasks'

export interface TaskLibraryPartInput {
  part_id: number
  quantity_required?: number
}

export interface TaskLibraryPayload {
  title: string
  description?: string | null
  schedule_type?: TaskLibraryScheduleType | null
  interval_days?: number | null
  interval_hours?: number | null
  estimated_duration_minutes?: number | null
  is_active?: boolean
  /** Only used on create — editing an existing library manages parts via add/remove below. */
  parts?: TaskLibraryPartInput[]
}

export interface TaskLibraryPartPayload {
  part_id: number
  quantity_required?: number
  notes?: string | null
}

export async function fetchTaskLibrariesForEquipment(equipmentId: number): Promise<TaskLibrary[]> {
  const { data } = await apiClient.get<{ data: TaskLibrary[] }>(`/equipment/${equipmentId}/task-libraries`)
  return data.data
}

export async function fetchTaskLibrariesForBranch(branchId: number): Promise<TaskLibrary[]> {
  const { data } = await apiClient.get<{ data: TaskLibrary[] }>(`/branches/${branchId}/task-libraries`)
  return data.data
}

export async function createTaskLibrary(
  equipmentId: number,
  payload: TaskLibraryPayload,
): Promise<TaskLibrary> {
  const { data } = await apiClient.post<{ data: TaskLibrary }>(
    `/equipment/${equipmentId}/task-libraries`,
    payload,
  )
  return data.data
}

export async function updateTaskLibrary(
  id: number,
  payload: Partial<TaskLibraryPayload>,
): Promise<TaskLibrary> {
  const { data } = await apiClient.put<{ data: TaskLibrary }>(`/task-libraries/${id}`, payload)
  return data.data
}

export async function deleteTaskLibrary(id: number): Promise<void> {
  await apiClient.delete(`/task-libraries/${id}`)
}

export async function addTaskLibraryPart(
  taskLibraryId: number,
  payload: TaskLibraryPartPayload,
): Promise<TaskLibraryPart> {
  const { data } = await apiClient.post<{ data: TaskLibraryPart }>(
    `/task-libraries/${taskLibraryId}/parts`,
    payload,
  )
  return data.data
}

export async function removeTaskLibraryPart(id: number): Promise<void> {
  await apiClient.delete(`/task-library-parts/${id}`)
}

export interface ScheduleTaskLibraryPayload {
  due_date: string
  assigned_to?: number | null
}

export async function scheduleTaskLibrary(
  taskLibraryId: number,
  payload: ScheduleTaskLibraryPayload,
): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(
    `/task-libraries/${taskLibraryId}/schedule`,
    payload,
  )
  return data.data
}
