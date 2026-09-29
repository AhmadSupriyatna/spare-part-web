import { apiClient } from '@/lib/api-client'

export interface MonthlyCount {
  month: string
  count: number
}

export interface CostHeatmapCell {
  line_name: string
  machine_name: string
  cost: string
}

export interface BudgetProjectionRow {
  month: string
  planned_cumulative: string
  /** null for a month that hasn't happened yet — the chart stops the actual line at "today" instead of drawing a misleading flat tail. */
  actual_cumulative: string | null
}

export interface BudgetProjection {
  year: number
  planned_total: string
  rows: BudgetProjectionRow[]
}

export interface DashboardAnalytics {
  failure_trend: MonthlyCount[]
  cost_heatmap: CostHeatmapCell[]
  budget_projection: BudgetProjection
}

export async function fetchDashboardAnalytics(branchId: number): Promise<DashboardAnalytics> {
  const { data } = await apiClient.get<{ data: DashboardAnalytics }>(`/branches/${branchId}/dashboard-analytics`)
  return data.data
}
