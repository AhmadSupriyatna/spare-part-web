import { apiClient } from '@/lib/api-client'
import type { AuthUser, LoginPayload, LoginResponse } from '@/types/auth'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/login', payload)
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout')
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/user')
  return data
}

export interface UpdateProfilePayload {
  name?: string
  current_password?: string
  password?: string
}

/** Self-service "Edit Profil" — PUT /user, distinct from the superadmin-only updateUser() in features/users/api.ts. */
export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const { data } = await apiClient.put<AuthUser>('/user', payload)
  return data
}
