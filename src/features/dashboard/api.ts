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

export interface PmVsFailureCost {
  pm_cost: string
  failure_cost: string
}

export interface EquipmentCoverage {
  total_equipment: number
  without_library: number
}

export interface TechnicianWorkloadRow {
  name: string
  open_count: number
}

export interface PartMovementRow {
  part_name: string
  item_master_no: string
  /** Present on fast_moving rows. */
  qty_issued?: number
  /** Present on slow_moving rows. */
  quantity_on_hand?: number
}

export interface PartMovement {
  fast_moving: PartMovementRow[]
  slow_moving: PartMovementRow[]
}

export interface StockMovementTrendPoint {
  month: string
  in_qty: number
  out_qty: number
}

/** One leaf of the Line > Machine > Equipment > Part hierarchy — see HierarchicalSunburst. */
export interface InstallationSunburstRow {
  line_name: string
  machine_name: string
  equipment_name: string
  part_name: string
  count: number
}

/** Same hierarchy as InstallationSunburstRow, cost instead of count. */
export interface CostSunburstRow {
  line_name: string
  machine_name: string
  equipment_name: string
  part_name: string
  cost: string
}

/** scheduled_count = installed by a PM Task; failure_count = installed from an approved breakdown/QR replacement request. */
export interface ScheduledVsFailureTrendPoint {
  month: string
  scheduled_count: number
  failure_count: number
}

export interface DashboardAnalytics {
  /** The calendar year every time-windowed chart below is scoped to — echoes back the `year` query param (defaults to the current year). */
  year: number
  /** Every year with at least some activity for this branch, newest first, plus the current year unconditionally — the year dropdown's option list. */
  available_years: number[]
  failure_trend: MonthlyTrendPoint[]
  cost_heatmap: CostHeatmapCell[]
  budget_projection: BudgetProjection
  failure_radial: FailureRadialCell[]
  maintenance_performance: MaintenancePerformance
  at_risk_parts: AtRiskPart[]
  installation_map: InstallationMapCell[]
  cost_by_part: CostByPartRow[]
  stock_value: string
  pm_vs_failure_cost: PmVsFailureCost
  equipment_coverage: EquipmentCoverage
  technician_workload: TechnicianWorkloadRow[]
  part_movement: PartMovement
  stock_movement_trend: StockMovementTrendPoint[]
  installation_sunburst: InstallationSunburstRow[]
  cost_sunburst: CostSunburstRow[]
  scheduled_vs_failure_trend: ScheduledVsFailureTrendPoint[]
}

export async function fetchDashboardAnalytics(branchId: number, year: number): Promise<DashboardAnalytics> {
  const { data } = await apiClient.get<{ data: DashboardAnalytics }>(`/branches/${branchId}/dashboard-analytics`, { params: { year } })
  return data.data
}
