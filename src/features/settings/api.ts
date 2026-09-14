import { apiClient } from '@/lib/api-client'
import type { CompanySetting } from '@/types/settings'

export interface CompanySettingPayload {
  name: string
  logo?: File | null
}

export async function fetchCompanySetting(): Promise<CompanySetting> {
  const { data } = await apiClient.get<{ data: CompanySetting }>('/settings/company')
  return data.data
}

export async function updateCompanySetting(payload: CompanySettingPayload): Promise<CompanySetting> {
  const formData = new FormData()
  formData.append('name', payload.name)
  if (payload.logo) formData.append('logo', payload.logo)
  formData.append('_method', 'PUT')

  const { data } = await apiClient.post<{ data: CompanySetting }>('/settings/company', formData)
  return data.data
}
