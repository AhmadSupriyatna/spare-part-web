import { apiClient } from '@/lib/api-client'
import type { Part } from '@/types/inventory'

export interface PartPayload {
  sku: string
  name: string
  description?: string | null
  unit: string
  category?: string | null
  is_active?: boolean
}

export async function fetchParts(): Promise<Part[]> {
  const { data } = await apiClient.get<{ data: Part[] }>('/parts')
  return data.data
}

export async function fetchPart(id: number): Promise<Part> {
  const { data } = await apiClient.get<{ data: Part }>(`/parts/${id}`)
  return data.data
}

export async function createPart(payload: PartPayload): Promise<Part> {
  const { data } = await apiClient.post<{ data: Part }>('/parts', payload)
  return data.data
}

export async function updatePart(id: number, payload: Partial<PartPayload>): Promise<Part> {
  const { data } = await apiClient.put<{ data: Part }>(`/parts/${id}`, payload)
  return data.data
}

export async function deletePart(id: number): Promise<void> {
  await apiClient.delete(`/parts/${id}`)
}
