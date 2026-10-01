import { apiClient } from '@/lib/api-client'

export interface MonthlyTrendPoint {
  month: string
  failure_count: number
  /** Every new PartInstallation, first-time or not — a "part-swap activity" trend, not filtered to only true replacements (see DashboardAnalyticsController::failureTrend()'s docblock). */
  replacement_count: number
  /** Actual spend that month (TYPE_ISSUE ledger rows), same source as cost_heatmap/cost_by_part. */
  replacement_cost: string
}

export interface CostHeatmapCell {
  line_name: string
  machine_name: string
  cost: string
}

export interface FailureRadialCell {
  line_name: string
  machine_name: string
  count: number
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

export interface MaintenancePerformance {
  on_time_count: number
  late_count: number
}

export interface AtRiskPart {
  part_name: string
  item_master_no: string
  equipment_name: string
  machine_name: string | null
  line_name: string | null
  /** null if the part has no estimated_lifetime_hours to compare against — never shown as 0%. */
  percent_used: number | null
}

export interface InstallationMapCell {
  line_name: string
  machine_name: string
  count: number
}

export interface CostByPartRow {
  part_name: string
  item_master_no: string
  cost: string
}

export interface DashboardAnalytics {
  failure_trend: MonthlyTrendPoint[]
  cost_heatmap: CostHeatmapCell[]
  budget_projection: BudgetProjection
  failure_radial: FailureRadialCell[]
  maintenance_performance: MaintenancePerformance
  at_risk_parts: AtRiskPart[]
  installation_map: InstallationMapCell[]
  cost_by_part: CostByPartRow[]
}

export async function fetchDashboardAnalytics(branchId: number): Promise<DashboardAnalytics> {
  const { data } = await apiClient.get<{ data: DashboardAnalytics }>(`/branches/${branchId}/dashboard-analytics`)
  return data.data
}
