import { apiClient } from '@/lib/api-client'

export interface AssetCategory {
  id: number
  type: 'equipment'
  name: string
}

export async function fetchAssetCategories(): Promise<AssetCategory[]> {
  const { data } = await apiClient.get<{ data: AssetCategory[] }>('/asset-categories')
  return data.data
}

export async function createAssetCategory(payload: Pick<AssetCategory, 'name'>): Promise<AssetCategory> {
  const { data } = await apiClient.post<{ data: AssetCategory }>('/asset-categories', payload)
  return data.data
}

export async function updateAssetCategory(id: number, payload: Pick<AssetCategory, 'name'>): Promise<AssetCategory> {
  const { data } = await apiClient.put<{ data: AssetCategory }>(`/asset-categories/${id}`, payload)
  return data.data
}

export async function deleteAssetCategory(id: number): Promise<void> {
  await apiClient.delete(`/asset-categories/${id}`)
}
