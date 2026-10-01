import { apiClient } from '@/lib/api-client'
import type { Branch } from '@/types/auth'

export interface BranchPayload {
  code: string
  name: string
  address?: string | null
  is_active?: boolean
  /** "Standar Minimum Plant" — this Plant's default minimum_stock for a Part whose minimum_stock_strategy is 'standard'. */
  default_minimum_stock?: number
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<{ data: Branch[] }>('/branches')
  return data.data
}

export async function createBranch(payload: BranchPayload): Promise<Branch> {
  const { data } = await apiClient.post<{ data: Branch }>('/branches', payload)
  return data.data
}

export async function updateBranch(id: number, payload: Partial<BranchPayload>): Promise<Branch> {
  const { data } = await apiClient.put<{ data: Branch }>(`/branches/${id}`, payload)
  return data.data
}

export async function deleteBranch(id: number, password: string): Promise<void> {
  await apiClient.delete(`/branches/${id}`, { data: { password } })
}

export async function archiveBranch(id: number, password: string): Promise<Branch> {
  const { data } = await apiClient.post<{ data: Branch }>(`/branches/${id}/archive`, { password })
  return data.data
}

export async function unarchiveBranch(id: number): Promise<Branch> {
  const { data } = await apiClient.post<{ data: Branch }>(`/branches/${id}/unarchive`)
  return data.data
}
