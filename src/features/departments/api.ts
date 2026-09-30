import { apiClient } from '@/lib/api-client'

export interface Department {
  id: number
  name: string
}

export interface DepartmentPayload {
  name: string
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<{ data: Department[] }>('/departments')
  return data.data
}

/** Unauthenticated — the public FP3 request form needs this same list. */
export async function fetchPublicDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<{ data: Department[] }>('/public/departments')
  return data.data
}

export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  const { data } = await apiClient.post<{ data: Department }>('/departments', payload)
  return data.data
}

export async function updateDepartment(id: number, payload: DepartmentPayload): Promise<Department> {
  const { data } = await apiClient.put<{ data: Department }>(`/departments/${id}`, payload)
  return data.data
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`)
}
