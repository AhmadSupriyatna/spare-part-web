import { apiClient } from '@/lib/api-client'
import type { PartSupplier } from '@/types/relations'

export interface PartSupplierPayload {
  supplier_id: number
  price?: number | null
  lead_time_days?: number | null
  is_preferred?: boolean
  notes?: string | null
}

export async function fetchPartSuppliers(partId: number): Promise<PartSupplier[]> {
  const { data } = await apiClient.get<{ data: PartSupplier[] }>(`/parts/${partId}/suppliers`)
  return data.data
}

export async function addPartSupplier(partId: number, payload: PartSupplierPayload): Promise<PartSupplier> {
  const { data } = await apiClient.post<{ data: PartSupplier }>(`/parts/${partId}/suppliers`, payload)
  return data.data
}

export async function updatePartSupplier(
  id: number,
  payload: Partial<PartSupplierPayload>,
): Promise<PartSupplier> {
  const { data } = await apiClient.put<{ data: PartSupplier }>(`/part-suppliers/${id}`, payload)
  return data.data
}

export async function removePartSupplier(id: number): Promise<void> {
  await apiClient.delete(`/part-suppliers/${id}`)
}
