import { apiClient } from '@/lib/api-client'
import type { UserRole } from '@/types/auth'

export interface UserSummary {
  id: number
  name: string
  email: string
  roles: UserRole[]
}

export async function fetchUsers(role?: UserRole): Promise<UserSummary[]> {
  const { data } = await apiClient.get<{ data: UserSummary[] }>('/users', {
    params: role ? { role } : undefined,
  })
  return data.data
}
