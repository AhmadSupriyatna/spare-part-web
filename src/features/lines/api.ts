import { apiClient } from '@/lib/api-client'
import type { LineKwhLog, LineKwhReportRow, LineRuntimeLog, LineRuntimeReportRow, ProductionLine, Task } from '@/types/tasks'
import type { PaginatedResponse } from '@/types/inventory'

export interface LinePayload {
  code: string
  name: string
  /** Overrides the company-wide default (Settings) for this line's Life Based due-date/budget projections. null/omitted falls back to that default. */
  avg_weekly_operating_hours?: number | null
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

/** Every runtime log for a line, across all pages — for the printed report, which shows the full history rather than one page at a time. */
export async function fetchAllLineRuntimeLogs(id: number): Promise<LineRuntimeLog[]> {
  const all: LineRuntimeLog[] = []
  let page = 1
  while (true) {
    const res = await fetchLineRuntimeLogs(id, page)
    all.push(...res.data)
    if (page >= res.meta.last_page) break
    page++
  }
  return all
}

/**
 * Laporan Pemeriksaan Mesin, aggregated across every Machine under this
 * Line — every WO due within [from, to]. Purely a read-time grouping — see
 * TaskController::woReportForLine().
 */
export async function fetchWoReportForLine(lineId: number, from: string, to: string): Promise<Task[]> {
  const { data } = await apiClient.get<{ data: Task[] }>(`/lines/${lineId}/wo-report`, {
    params: { from, to },
  })
  return data.data
}

/** The line's running hours as of a past date — never today's live total, see LineController::runtimeAsOf(). */
export async function fetchLineRuntimeAt(lineId: number, date: string): Promise<number | null> {
  const { data } = await apiClient.get<{ data: { hours: number | null } }>(`/lines/${lineId}/runtime-at`, {
    params: { date },
  })
  return data.data.hours
}

export interface AddLineKwhPayload {
  /** Any date inside the target week — the server normalizes it to that week's Monday. */
  for_date: string
  /** Meter reading in 'reading' mode, that week's usage directly in 'direct' mode — see CompanySetting.kwh_input_mode. */
  value: number
  /** Optional — same reading/direct duality as `value`, but for kVA. Omit to log kWh alone; PF is derived server-side from this and never sent. */
  kva_value?: number
  notes?: string
}

/** Upserted by (line, week) — resubmitting the same week corrects it instead of creating a duplicate. */
export async function addLineKwh(id: number, payload: AddLineKwhPayload): Promise<LineKwhLog> {
  const { data } = await apiClient.post<{ data: LineKwhLog }>(`/lines/${id}/kwh`, payload)
  return data.data
}

export async function fetchLineKwhLogs(id: number, page = 1): Promise<PaginatedResponse<LineKwhLog>> {
  const { data } = await apiClient.get<PaginatedResponse<LineKwhLog>>(`/lines/${id}/kwh-logs`, {
    params: { page },
  })
  return data
}

/** "Laporan kWh" — every Line in the branch, totaled for `month` (YYYY-MM). */
export async function fetchLineKwhReport(branchId: number, month: string): Promise<LineKwhReportRow[]> {
  const { data } = await apiClient.get<{ data: LineKwhReportRow[] }>(`/branches/${branchId}/lines/kwh-report`, {
    params: { month },
  })
  return data.data
}

/** "Laporan Running Hours Line" — every Line in the branch, for `month` (YYYY-MM). */
export async function fetchLineRuntimeReport(branchId: number, month: string): Promise<LineRuntimeReportRow[]> {
  const { data } = await apiClient.get<{ data: LineRuntimeReportRow[] }>(
    `/branches/${branchId}/lines/runtime-report`,
    { params: { month } },
  )
  return data.data
}
