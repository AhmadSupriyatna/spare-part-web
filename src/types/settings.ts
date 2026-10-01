export type KwhInputMode = 'reading' | 'direct'

export interface CompanySetting {
  id: number
  name: string
  logo_url: string | null
  app_name: string
  app_logo_url: string | null
  avg_weekly_operating_hours: number
  kwh_input_mode: KwhInputMode
}
