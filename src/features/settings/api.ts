import { apiClient } from '@/lib/api-client'
import type { CompanySetting, KwhInputMode } from '@/types/settings'

export interface CompanySettingPayload {
  name: string
  logo?: File | null
  avg_weekly_operating_hours?: number
  // Only ever persisted by the backend when the requester is Superadmin —
  // safe to always send, the API silently drops it otherwise.
  app_name?: string | null
  app_logo?: File | null
  kwh_input_mode?: KwhInputMode
}

export async function fetchCompanySetting(): Promise<CompanySetting> {
  const { data } = await apiClient.get<{ data: CompanySetting }>('/settings/company')
  return data.data
}

export async function updateCompanySetting(payload: CompanySettingPayload): Promise<CompanySetting> {
  const formData = new FormData()
  formData.append('name', payload.name)
  if (payload.logo) formData.append('logo', payload.logo)
  if (payload.avg_weekly_operating_hours != null) {
    formData.append('avg_weekly_operating_hours', String(payload.avg_weekly_operating_hours))
  }
  if (payload.app_name != null) formData.append('app_name', payload.app_name)
  if (payload.app_logo) formData.append('app_logo', payload.app_logo)
  if (payload.kwh_input_mode) formData.append('kwh_input_mode', payload.kwh_input_mode)
  formData.append('_method', 'PUT')

  const { data } = await apiClient.post<{ data: CompanySetting }>('/settings/company', formData)
  return data.data
}
