import { apiClient } from '@/lib/api-client'
import type { ScheduleType, Task, WorkOrder } from '@/types/tasks'

export interface WorkOrderPayload {
  title: string
  description?: string | null
  part_id?: number | null
  schedule_type: ScheduleType
  interval_days?: number | null
  interval_hours?: number | null
  is_active?: boolean
}

export async function fetchWorkOrders(equipmentId: number): Promise<WorkOrder[]> {
  const { data } = await apiClient.get<{ data: WorkOrder[] }>(`/equipment/${equipmentId}/work-orders`)
  return data.data
}

export async function createWorkOrder(equipmentId: number, payload: WorkOrderPayload): Promise<WorkOrder> {
  const { data } = await apiClient.post<{ data: WorkOrder }>(
    `/equipment/${equipmentId}/work-orders`,
    payload,
  )
  return data.data
}

export async function updateWorkOrder(id: number, payload: Partial<WorkOrderPayload>): Promise<WorkOrder> {
  const { data } = await apiClient.put<{ data: WorkOrder }>(`/work-orders/${id}`, payload)
  return data.data
}

export async function deleteWorkOrder(id: number): Promise<void> {
  await apiClient.delete(`/work-orders/${id}`)
}

export async function generateTaskFromWorkOrder(id: number): Promise<Task> {
  const { data } = await apiClient.post<{ data: Task }>(`/work-orders/${id}/generate-task`)
  return data.data
}
