import { apiClient } from '@/lib/api-client'

export interface Budget {
  id: number
  branch_id: number
  category: string
  category_label: string
  year: number
  planned_amount: string
  corrective_amount: string
  total_amount: string
  notes: string | null
  created_by: number | null
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export interface BudgetPayload {
  category?: string
  year: number
  planned_amount: number | string
  corrective_amount?: number | string
  notes?: string | null
}

export interface BudgetEstimateItem {
  part_id: number
  part_name: string
  item_master_no: string
  unit_cost: string
  active_installations: number
  expected_replacements_per_year: number
  estimated_cost: string
}

export interface BudgetEstimateExcludedPart {
  part_id: number
  part_name: string
  item_master_no: string
  reason: string
}

export interface BudgetEstimate {
  planned_amount: string
  items: BudgetEstimateItem[]
  excluded_parts: BudgetEstimateExcludedPart[]
}

export async function fetchBudgets(branchId: number, year?: number): Promise<Budget[]> {
  const { data } = await apiClient.get<{ data: Budget[] }>(`/branches/${branchId}/budgets`, {
    params: year ? { year } : undefined,
  })
  return data.data
}

export async function estimateBudget(branchId: number, category: string): Promise<BudgetEstimate> {
  const { data } = await apiClient.get<BudgetEstimate>(`/branches/${branchId}/budgets/estimate`, {
    params: { category },
  })
  return data
}

export async function createBudget(branchId: number, payload: BudgetPayload): Promise<Budget> {
  const { data } = await apiClient.post<{ data: Budget }>(`/branches/${branchId}/budgets`, payload)
  return data.data
}

export async function updateBudget(id: number, payload: Partial<BudgetPayload>): Promise<Budget> {
  const { data } = await apiClient.put<{ data: Budget }>(`/budgets/${id}`, payload)
  return data.data
}

export async function deleteBudget(id: number): Promise<void> {
  await apiClient.delete(`/budgets/${id}`)
}
