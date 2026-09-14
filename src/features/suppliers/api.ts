import { apiClient } from '@/lib/api-client'
import type { Supplier } from '@/types/inventory'

export interface SupplierPayload {
  name: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active?: boolean
}

export async function fetchSuppliers(branchId: number): Promise<Supplier[]> {
  const { data } = await apiClient.get<{ data: Supplier[] }>(`/branches/${branchId}/suppliers`)
  return data.data
}

export async function fetchSupplier(id: number): Promise<Supplier> {
  const { data } = await apiClient.get<{ data: Supplier }>(`/suppliers/${id}`)
  return data.data
}

export async function createSupplier(branchId: number, payload: SupplierPayload): Promise<Supplier> {
  const { data } = await apiClient.post<{ data: Supplier }>(`/branches/${branchId}/suppliers`, payload)
  return data.data
}

export async function updateSupplier(id: number, payload: Partial<SupplierPayload>): Promise<Supplier> {
  const { data } = await apiClient.put<{ data: Supplier }>(`/suppliers/${id}`, payload)
  return data.data
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`)
}
