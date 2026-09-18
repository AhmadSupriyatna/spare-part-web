import { apiClient } from '@/lib/api-client'

export interface Category {
  id: number
  name: string
}

export interface CategoryPayload {
  name: string
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<{ data: Category[] }>('/categories')
  return data.data
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const { data } = await apiClient.post<{ data: Category }>('/categories', payload)
  return data.data
}

export async function updateCategory(id: number, payload: CategoryPayload): Promise<Category> {
  const { data } = await apiClient.put<{ data: Category }>(`/categories/${id}`, payload)
  return data.data
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}
