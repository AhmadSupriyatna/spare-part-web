import { apiClient } from '@/lib/api-client'
import type { ProductionLine } from '@/types/tasks'

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

export async function deleteLine(id: number): Promise<void> {
  await apiClient.delete(`/lines/${id}`)
}
