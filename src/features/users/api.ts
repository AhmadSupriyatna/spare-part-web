import { apiClient } from '@/lib/api-client'
import type { Branch, UserRole } from '@/types/auth'

export interface UserSummary {
  id: number
  name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  roles: UserRole[]
  branches: Branch[]
}

export interface UserPayload {
  name: string
  email: string
  password?: string
  role: UserRole
  branch_ids?: number[]
  avatar?: File | null
}

function toFormData(payload: Partial<UserPayload>): FormData {
  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    if (key === 'avatar') {
      if (value instanceof File) formData.append('avatar', value)
      continue
    }
    if (key === 'branch_ids' && Array.isArray(value)) {
      value.forEach((id) => formData.append('branch_ids[]', String(id)))
      continue
    }
    formData.append(key, String(value))
  }

  return formData
}

export async function fetchUsers(role?: UserRole): Promise<UserSummary[]> {
  const { data } = await apiClient.get<{ data: UserSummary[] }>('/users', {
    params: role ? { role } : undefined,
  })
  return data.data
}

export async function createUser(payload: UserPayload): Promise<UserSummary> {
  const { data } = await apiClient.post<{ data: UserSummary }>('/users', toFormData(payload))
  return data.data
}

export async function updateUser(id: number, payload: Partial<UserPayload>): Promise<UserSummary> {
  const formData = toFormData(payload)
  formData.append('_method', 'PUT')
  const { data } = await apiClient.post<{ data: UserSummary }>(`/users/${id}`, formData)
  return data.data
}

export async function deactivateUser(id: number): Promise<UserSummary> {
  const { data } = await apiClient.post<{ data: UserSummary }>(`/users/${id}/deactivate`)
  return data.data
}

export async function activateUser(id: number): Promise<UserSummary> {
  const { data } = await apiClient.post<{ data: UserSummary }>(`/users/${id}/activate`)
  return data.data
}
