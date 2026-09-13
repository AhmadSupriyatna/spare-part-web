import { apiClient } from '@/lib/api-client'
import type { Branch } from '@/types/auth'

export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<{ data: Branch[] }>('/branches')
  return data.data
}
