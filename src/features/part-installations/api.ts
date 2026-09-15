import { apiClient } from '@/lib/api-client'
import type { PartInstallation } from '@/types/relations'

export interface PartInstallationPayload {
  part_id: number
  part_unit_id?: number | null
  installed_at?: string | null
  notes?: string | null
}

export async function fetchPartInstallations(equipmentId: number): Promise<PartInstallation[]> {
  const { data } = await apiClient.get<{ data: PartInstallation[] }>(
    `/equipment/${equipmentId}/part-installations`,
  )
  return data.data
}

export async function fetchInstallationsForPart(partId: number): Promise<PartInstallation[]> {
  const { data } = await apiClient.get<{ data: PartInstallation[] }>(`/parts/${partId}/part-installations`)
  return data.data
}

export async function installPart(
  equipmentId: number,
  payload: PartInstallationPayload,
): Promise<PartInstallation> {
  const { data } = await apiClient.post<{ data: PartInstallation }>(
    `/equipment/${equipmentId}/part-installations`,
    payload,
  )
  return data.data
}

export async function removePartInstallation(id: number): Promise<PartInstallation> {
  const { data } = await apiClient.post<{ data: PartInstallation }>(`/part-installations/${id}/remove`)
  return data.data
}

export async function updatePartInstallation(id: number, notes: string | null): Promise<PartInstallation> {
  const { data } = await apiClient.put<{ data: PartInstallation }>(`/part-installations/${id}`, { notes })
  return data.data
}
