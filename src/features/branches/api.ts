import { apiClient } from '@/lib/api-client'
import type { Branch } from '@/types/auth'

export interface BranchPayload {
  code: string
  name: string
  address?: string | null
  is_active?: boolean
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

export async function deleteBranch(id: number): Promise<void> {
  await apiClient.delete(`/branches/${id}`)
}
