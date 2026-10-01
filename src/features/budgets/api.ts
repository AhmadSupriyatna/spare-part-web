import { apiClient } from '@/lib/api-client'
import type { PartReplacementStrategy } from '@/types/inventory'

export interface BudgetLineBreakdown {
  line_id: number | null
  line_name: string
  active_installations: number
  pcs_per_year: number
  estimated_cost: string
}

export interface BudgetMachineBreakdown {
  machine_id: number | null
  machine_name: string
  /** The owning Line's name, "Luar Line", or "Tanpa Mesin" — group/sort by this for a Line vs Luar Line section split. */
  location_label: string
  active_installations: number
  pcs_per_year: number
  estimated_cost: string
}

export interface BudgetItem {
  id: number
  part_id: number
  part_name: string
  item_master_no: string
  /** Only set for a Failure Based budget. */
  estimated_failure_count_per_year: string | null
  /** Only set for a Scheduled budget. */
  replacement_probability_percent: string | null
  unit_cost: string
  estimated_cost: string
  by_line: BudgetLineBreakdown[]
  by_machine: BudgetMachineBreakdown[]
}

export type BudgetManualEntryType = 'planned' | 'actual'

export interface BudgetManualEntry {
  id: number
  budget_id: number
  type: BudgetManualEntryType
  line_id: number | null
  line_name: string | null
  machine_id: number | null
  machine_name: string | null
  description: string
  amount: string
  occurred_at: string | null
  created_by_name: string | null
  created_at: string
}

export interface Budget {
  id: number
  branch_id: number
  replacement_strategy: PartReplacementStrategy
  /** Only meaningful for a Life Based budget — one assumption for every part in it, not tuned per part. */
  global_lifetime_percent: string | null
  /** Applies across all 3 strategies. */
  global_price_increase_percent: string
  year: number
  planned_amount: string
  corrective_amount: string
  total_amount: string
  items: BudgetItem[]
  manual_entries: BudgetManualEntry[]
  actual_planned?: string
  actual_unplanned?: string
  actual_manual?: string
  actual_total?: string
  unpriced_transactions?: number
  notes: string | null
  created_by: number | null
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export interface BudgetStrategyPart {
  part_id: number
  part_name: string
  item_master_no: string
  unit_cost: string
  estimated_lifetime_hours: number | null
  active_installations: number
}

export interface BudgetItemInput {
  part_id: number
  /** Required when the budget's strategy is Failure Based. */
  estimated_failure_count_per_year?: number
  /** Required when the budget's strategy is Scheduled. */
  replacement_probability_percent?: number
}

export interface BudgetPayload {
  replacement_strategy?: PartReplacementStrategy
  year?: number
  /** Required for Life Based, prohibited otherwise. */
  global_lifetime_percent?: number
  global_price_increase_percent?: number
  items?: BudgetItemInput[]
  corrective_amount?: number
  notes?: string | null
}

export interface BudgetManualEntryPayload {
  type: BudgetManualEntryType
  line_id?: number | null
  machine_id?: number | null
  description: string
  amount: number
  occurred_at?: string | null
}

export async function fetchBudgets(branchId: number, year?: number): Promise<Budget[]> {
  const { data } = await apiClient.get<{ data: Budget[] }>(`/branches/${branchId}/budgets`, {
    params: year ? { year } : undefined,
  })
  return data.data
}

/** Parts under this replacement strategy (branch-wide) that currently have an active installation. */
export async function fetchBudgetPartsForStrategy(
  branchId: number,
  strategy: PartReplacementStrategy,
): Promise<BudgetStrategyPart[]> {
  const { data } = await apiClient.get<{ data: BudgetStrategyPart[] }>(`/branches/${branchId}/budgets/parts`, {
    params: { strategy },
  })
  return data.data
}

export async function createBudget(branchId: number, payload: BudgetPayload): Promise<Budget> {
  const { data } = await apiClient.post<{ data: Budget }>(`/branches/${branchId}/budgets`, payload)
  return data.data
}

export async function updateBudget(id: number, payload: BudgetPayload): Promise<Budget> {
  const { data } = await apiClient.put<{ data: Budget }>(`/budgets/${id}`, payload)
  return data.data
}

export async function deleteBudget(id: number): Promise<void> {
  await apiClient.delete(`/budgets/${id}`)
}

export async function createBudgetManualEntry(budgetId: number, payload: BudgetManualEntryPayload): Promise<BudgetManualEntry> {
  const { data } = await apiClient.post<{ data: BudgetManualEntry }>(`/budgets/${budgetId}/manual-entries`, payload)
  return data.data
}

export async function deleteBudgetManualEntry(id: number): Promise<void> {
  await apiClient.delete(`/budget-manual-entries/${id}`)
}
