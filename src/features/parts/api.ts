import { apiClient } from '@/lib/api-client'
import type { Part } from '@/types/inventory'

export interface PartPayload {
  item_master_no: string
  name: string
  description?: string | null
  unit: string
  category?: string | null
  price?: number
  image?: File | null
  is_active?: boolean
}

function toFormData(payload: Partial<PartPayload>): FormData {
  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    if (key === 'image') {
      if (value instanceof File) formData.append('image', value)
      continue
    }
    formData.append(key, String(value))
  }

  return formData
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
  const { data } = await apiClient.post<{ data: Part }>('/parts', toFormData(payload))
  return data.data
}

export async function updatePart(id: number, payload: Partial<PartPayload>): Promise<Part> {
  const formData = toFormData(payload)
  formData.append('_method', 'PUT')
  const { data } = await apiClient.post<{ data: Part }>(`/parts/${id}`, formData)
  return data.data
}

export async function deletePart(id: number): Promise<void> {
  await apiClient.delete(`/parts/${id}`)
}
