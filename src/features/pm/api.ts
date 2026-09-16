import { apiClient } from '@/lib/api-client'
import type { TaskReschedule } from '@/types/pm'

export async function fetchTaskRescheduleHistory(branchId: number): Promise<TaskReschedule[]> {
  const { data } = await apiClient.get<{ data: TaskReschedule[] }>(`/branches/${branchId}/task-reschedules`)
  return data.data
}

interface NationalHolidayEntry {
  date: string
  name: string
  is_civic: boolean
  is_religious: boolean
  is_cuti_bersama: boolean
}

/**
 * Public, CORS-open, static-per-year JSON — fetched directly from the
 * browser rather than proxied through our own backend. Returns a map of
 * "YYYY-MM-DD" -> holiday name for cheap lookup while rendering the
 * calendar grid.
 */
export async function fetchNationalHolidays(year: number): Promise<Record<string, string>> {
  const response = await fetch(`https://api.kemendesa.link/libur-nasional/api/holidays/${year}.json`)
  if (!response.ok) {
    throw new Error(`Gagal memuat data libur nasional (${response.status}).`)
  }
  const body: { data: NationalHolidayEntry[] } = await response.json()
  const map: Record<string, string> = {}
  for (const entry of body.data) {
    map[entry.date] = entry.name
  }
  return map
}
