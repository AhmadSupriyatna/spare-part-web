import { apiClient } from '@/lib/api-client'
import type { Location, Rack, RackLevel } from '@/types/inventory'

export interface LocationPayload {
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

export async function createLocation(rackLevelId: number, payload?: LocationPayload): Promise<Location> {
  const { data } = await apiClient.post<{ data: Location }>(`/rack-levels/${rackLevelId}/locations`, payload ?? {})
  return data.data
}

export async function updateLocation(id: number, payload: Partial<LocationPayload>): Promise<Location> {
  const { data } = await apiClient.put<{ data: Location }>(`/locations/${id}`, payload)
  return data.data
}

export async function deleteLocation(id: number): Promise<void> {
  await apiClient.delete(`/locations/${id}`)
}

export async function fetchRacks(branchId: number): Promise<Rack[]> {
  const { data } = await apiClient.get<{ data: Rack[] }>(`/branches/${branchId}/racks`)
  return data.data
}

export async function createRack(branchId: number): Promise<Rack> {
  const { data } = await apiClient.post<{ data: Rack }>(`/branches/${branchId}/racks`, {})
  return data.data
}

export async function deleteRack(id: number): Promise<void> {
  await apiClient.delete(`/racks/${id}`)
}

export async function createRackLevel(rackId: number): Promise<RackLevel> {
  const { data } = await apiClient.post<{ data: RackLevel }>(`/racks/${rackId}/levels`, {})
  return data.data
}

export async function deleteRackLevel(id: number): Promise<void> {
  await apiClient.delete(`/rack-levels/${id}`)
}
