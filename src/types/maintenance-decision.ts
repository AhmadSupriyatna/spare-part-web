export type MaintenanceDecisionType =
  | 'no_action'
  | 'monitor'
  | 'schedule_maintenance'
  | 'replace_part'
  | 'repair_part'
  | 'escalate'

export interface CreateMaintenanceDecisionPayload {
  decision: MaintenanceDecisionType
  notes?: string
  follow_up_task_library_id?: number
  follow_up_due_date?: string
  follow_up_title?: string
  follow_up_notes?: string
  follow_up_quantity?: number
}

export interface MaintenanceDecisionResponse {
  id: number
  finding_id: number
  decision: MaintenanceDecisionType
  decided_by: number
  decided_by_name: string | null
  decided_at: string
  notes: string | null
  resulting_task_id: number | null
  resulting_task_title: string | null
  resulting_replacement_request_id: number | null
  resulting_replacement_request_status: string | null
}
