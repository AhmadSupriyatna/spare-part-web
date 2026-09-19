import { apiClient } from '@/lib/api-client'

export interface BudgetLineBreakdown {
  line_id: number
  line_name: string
  active_installations: number
  pcs_per_year: number
  estimated_cost: string
}

export interface BudgetItem {
  id: number
  part_id: number
  part_name: string
  item_master_no: string
  estimated_lifetime_percent: string
  price_increase_percent: string
  unit_cost: string
  estimated_cost: string
  by_line: BudgetLineBreakdown[]
}

export interface Budget {
  id: number
  branch_id: number
  category: string
  category_label: string
  year: number
  planned_amount: string
  corrective_amount: string
  total_amount: string
  items: BudgetItem[]
  actual_planned?: string
  actual_unplanned?: string
  actual_total?: string
  unpriced_transactions?: number
  notes: string | null
  created_by: number | null
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export interface BudgetCategoryPart {
  part_id: number
  part_name: string
  item_master_no: string
  unit_cost: string
  estimated_lifetime_hours: number | null
  active_installations: number
}

export interface BudgetItemInput {
  part_id: number
  estimated_lifetime_percent: number
  price_increase_percent: number
}

export interface BudgetPayload {
  category?: string
  year?: number
  items?: BudgetItemInput[]
  corrective_amount?: number
  notes?: string | null
}

export async function fetchBudgets(branchId: number, year?: number): Promise<Budget[]> {
  const { data } = await apiClient.get<{ data: Budget[] }>(`/branches/${branchId}/budgets`, {
    params: year ? { year } : undefined,
  })
  return data.data
}

/** Parts in this category (branch-wide) that currently have an active installation. */
export async function fetchBudgetPartsForCategory(branchId: number, category: string): Promise<BudgetCategoryPart[]> {
  const { data } = await apiClient.get<{ data: BudgetCategoryPart[] }>(`/branches/${branchId}/budgets/parts`, {
    params: { category },
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
