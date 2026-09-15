import { apiClient } from '@/lib/api-client'
import type { GlobalSearchResults } from '@/types/search'

export async function searchGlobal(query: string, branchId: number | null): Promise<GlobalSearchResults> {
  const { data } = await apiClient.get<{ data: GlobalSearchResults }>('/search', {
    params: { q: query, branch_id: branchId ?? undefined },
  })
  return data.data
}
