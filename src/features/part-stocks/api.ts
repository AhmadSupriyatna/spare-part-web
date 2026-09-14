import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse, PartStock, StockLedgerEntry } from '@/types/inventory'

export interface ReceiveStockPayload {
  quantity: number
  unit_cost?: number
  supplier_id?: number
  notes?: string
}

export interface AdjustStockPayload {
  quantity_change: number
  reason: string
}

export async function fetchPartStocksForBranch(branchId: number): Promise<PartStock[]> {
  const { data } = await apiClient.get<{ data: PartStock[] }>(`/branches/${branchId}/part-stocks`)
  return data.data
}

export async function fetchPartStock(id: number): Promise<PartStock> {
  const { data } = await apiClient.get<{ data: PartStock }>(`/part-stocks/${id}`)
  return data.data
}

export async function fetchPartStockLedger(id: number): Promise<PaginatedResponse<StockLedgerEntry>> {
  const { data } = await apiClient.get<PaginatedResponse<StockLedgerEntry>>(`/part-stocks/${id}/ledger`)
  return data
}

export async function receiveStock(id: number, payload: ReceiveStockPayload): Promise<PartStock> {
  const { data } = await apiClient.post<{ data: PartStock }>(`/part-stocks/${id}/receive`, payload)
  return data.data
}

export async function adjustStock(id: number, payload: AdjustStockPayload): Promise<PartStock> {
  const { data } = await apiClient.post<{ data: PartStock }>(`/part-stocks/${id}/adjust`, payload)
  return data.data
}

export async function fetchPartStocksForLocation(locationId: number): Promise<PartStock[]> {
  const { data } = await apiClient.get<{ data: PartStock[] }>(`/locations/${locationId}/part-stocks`)
  return data.data
}

export async function updatePartStockLocation(id: number, locationId: number): Promise<PartStock> {
  const { data } = await apiClient.put<{ data: PartStock }>(`/part-stocks/${id}/location`, {
    location_id: locationId,
  })
  return data.data
}

