import { apiClient } from '@/lib/api-client'
import type { ReorderRequest, ReorderStatus, StockAlert } from '@/types/inventory'

export async function fetchStockAlerts(branchId: number): Promise<StockAlert[]> {
  const { data } = await apiClient.get<{ data: StockAlert[] }>(`/branches/${branchId}/stock-alerts`)
  return data.data
}

export async function fetchReorderRequests(
  branchId: number,
  status?: ReorderStatus,
): Promise<ReorderRequest[]> {
  const { data } = await apiClient.get<{ data: ReorderRequest[] }>(
    `/branches/${branchId}/reorder-requests`,
    { params: status ? { status } : undefined },
  )
  return data.data
}

export async function approveReorderRequest(id: number): Promise<ReorderRequest> {
  const { data } = await apiClient.post<{ data: ReorderRequest }>(`/reorder-requests/${id}/approve`)
  return data.data
}

export async function markReorderOrdered(id: number, notes?: string): Promise<ReorderRequest> {
  const { data } = await apiClient.post<{ data: ReorderRequest }>(
    `/reorder-requests/${id}/mark-ordered`,
    { notes },
  )
  return data.data
}

export async function cancelReorderRequest(id: number, notes?: string): Promise<ReorderRequest> {
  const { data } = await apiClient.post<{ data: ReorderRequest }>(
    `/reorder-requests/${id}/cancel`,
    { notes },
  )
  return data.data
}
