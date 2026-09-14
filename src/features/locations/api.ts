import { apiClient } from '@/lib/api-client'
import type { Location } from '@/types/inventory'

export interface LocationPayload {
  code: string
  rack: string
  bin: string
  description?: string | null
  is_active?: boolean
}

export async function fetchLocations(branchId: number): Promise<Location[]> {
  const { data } = await apiClient.get<{ data: Location[] }>(`/branches/${branchId}/locations`)
  return data.data
}

export async function fetchLocation(id: number): Promise<Location> {
  const { data } = await apiClient.get<{ data: Location }>(`/locations/${id}`)
  return data.data
}

export async function createLocation(branchId: number, payload: LocationPayload): Promise<Location> {
  const { data } = await apiClient.post<{ data: Location }>(`/branches/${branchId}/locations`, payload)
  return data.data
}

export async function updateLocation(id: number, payload: Partial<LocationPayload>): Promise<Location> {
  const { data } = await apiClient.put<{ data: Location }>(`/locations/${id}`, payload)
  return data.data
}

export async function deleteLocation(id: number): Promise<void> {
  await apiClient.delete(`/locations/${id}`)
}
