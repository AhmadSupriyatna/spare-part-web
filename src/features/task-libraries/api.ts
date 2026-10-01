import { apiClient } from '@/lib/api-client'
import type { TaskLibrary, TaskLibraryChecklistItem, TaskLibraryPart, TaskLibraryScheduleType } from '@/types/pm'
import type { Task } from '@/types/tasks'

/** No `quantity_required` — it's always the part's current active-installation count on the equipment, computed server-side (see Equipment::activeInstallationCountForPart()), never client-supplied. */
export interface TaskLibraryPartInput {
  part_id: number
}

/** A generic condition-check item (Kondisi Baik/Tidak), independent of the part checklist above — see TaskLibraryChecklistItem's backend docblock. */
export interface TaskLibraryChecklistItemInput {
  description: string
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
  /** Only used on create — editing an existing library manages checklist items via add/remove below. */
  checklist_items?: TaskLibraryChecklistItemInput[]
}

/** No `quantity_required` — see TaskLibraryPartInput. */
export interface TaskLibraryPartPayload {
  part_id: number
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

export async function addTaskLibraryChecklistItem(
  taskLibraryId: number,
  payload: TaskLibraryChecklistItemInput,
): Promise<TaskLibraryChecklistItem> {
  const { data } = await apiClient.post<{ data: TaskLibraryChecklistItem }>(
    `/task-libraries/${taskLibraryId}/checklist-items`,
    payload,
  )
  return data.data
}

export async function removeTaskLibraryChecklistItem(id: number): Promise<void> {
  await apiClient.delete(`/task-library-checklist-items/${id}`)
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
