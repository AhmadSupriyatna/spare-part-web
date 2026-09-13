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
