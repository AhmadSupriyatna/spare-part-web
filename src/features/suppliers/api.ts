import { apiClient } from '@/lib/api-client'
import type { Supplier } from '@/types/inventory'

export async function fetchSuppliers(branchId: number): Promise<Supplier[]> {
  const { data } = await apiClient.get<{ data: Supplier[] }>(`/branches/${branchId}/suppliers`)
  return data.data
}
