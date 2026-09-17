import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse, PartStock, StockLedgerEntry } from '@/types/inventory'

export interface ReceiveStockPayload {
  quantity: number
  total_price: number
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

export interface StockLedgerReportEntry {
  id: number
  occurred_at: string
  part_id: number
  part_name: string
  item_master_no: string
  type: string
  channel: string
  quantity_change: number
  balance_after: number
  notes: string | null
  user_name: string | null
  line_id: number | null
  line_name: string | null
  equipment_name: string | null
}

export interface StockLedgerReportFilters {
  from?: string
  to?: string
  part_id?: number
  line_id?: number
}

export async function fetchStockLedgerReport(
  branchId: number,
  filters: StockLedgerReportFilters,
): Promise<StockLedgerReportEntry[]> {
  const { data } = await apiClient.get<{ data: StockLedgerReportEntry[] }>(`/branches/${branchId}/stock-ledger`, {
    params: filters,
  })
  return data.data
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

