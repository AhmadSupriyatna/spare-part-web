import { apiClient } from '@/lib/api-client'
import type { LineRuntimeLog, ProductionLine } from '@/types/tasks'
import type { PaginatedResponse } from '@/types/inventory'

export interface LinePayload {
  code: string
  name: string
  is_active?: boolean
}

export async function fetchLines(branchId: number): Promise<ProductionLine[]> {
  const { data } = await apiClient.get<{ data: ProductionLine[] }>(`/branches/${branchId}/lines`)
  return data.data
}

export async function fetchLine(id: number): Promise<ProductionLine> {
  const { data } = await apiClient.get<{ data: ProductionLine }>(`/lines/${id}`)
  return data.data
}

export async function createLine(branchId: number, payload: LinePayload): Promise<ProductionLine> {
  const { data } = await apiClient.post<{ data: ProductionLine }>(`/branches/${branchId}/lines`, payload)
  return data.data
}

export async function updateLine(id: number, payload: Partial<LinePayload>): Promise<ProductionLine> {
  const { data } = await apiClient.put<{ data: ProductionLine }>(`/lines/${id}`, payload)
  return data.data
}

export async function deleteLine(id: number, password: string): Promise<void> {
  await apiClient.delete(`/lines/${id}`, { data: { password } })
}

export interface AddLineRuntimePayload {
  current_reading: number
  notes?: string
}

export async function addLineRuntime(id: number, payload: AddLineRuntimePayload): Promise<ProductionLine> {
  const { data } = await apiClient.post<{ data: ProductionLine }>(`/lines/${id}/runtime`, payload)
  return data.data
}

export async function fetchLineRuntimeLogs(
  id: number,
  page = 1,
): Promise<PaginatedResponse<LineRuntimeLog>> {
  const { data } = await apiClient.get<PaginatedResponse<LineRuntimeLog>>(`/lines/${id}/runtime-logs`, {
    params: { page },
  })
  return data
}
