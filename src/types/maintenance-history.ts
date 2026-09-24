export type MaintenanceHistoryEventType = 'PM' | 'FAILURE' | 'BREAKDOWN' | 'MAINTENANCE' | 'REPAIR' | 'FINDING' | 'DECISION'

export interface MaintenanceHistoryFindingSummary {
  id: number
  result: string
  severity: string | null
  recommendation: string | null
}

export interface MaintenanceHistoryDecisionSummary {
  id: number
  decision: string
  decided_by: string | null
  decided_at: string
  notes: string | null
  resulting_task_id: number | null
  resulting_task_title: string | null
  resulting_replacement_request_id: number | null
  resulting_replacement_request_status: string | null
}

export interface MaintenanceHistoryReplacementItem {
  old_installation: string | null
  old_part: string | null
  new_installation: string | null
  new_part: string | null
  quantity_used: number | null
}

export interface MaintenanceHistoryReplacementDetail {
  // Null for a planned (PM) replacement spanning more than one distinct
  // part in the same Task — summing quantities across different parts
  // wouldn't be a meaningful number. Use each item's own quantity_used
  // instead in that case.
  quantity_used: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  items: MaintenanceHistoryReplacementItem[]
}

export interface MaintenanceHistoryRepairDetail {
  disposition: string
  repair_cost: string | null
  removed_at: string | null
  repaired_at: string | null
}

export interface MaintenanceHistorySource {
  type: 'task_part_check' | 'part_replacement_request'
  task_id?: number
  task_title?: string | null
  request_id?: number
}

export interface MaintenanceHistoryEntry {
  id: string
  event_type: MaintenanceHistoryEventType
  event_date: string
  equipment_id: number | null
  equipment: string | null
  part_id: number | null
  part: string | null
  title: string
  description: string | null
  status: string | null
  performed_by: string | null
  finding: MaintenanceHistoryFindingSummary | null
  decision: MaintenanceHistoryDecisionSummary | null
  action: string | null
  replacement: MaintenanceHistoryReplacementDetail | null
  repair: MaintenanceHistoryRepairDetail | null
  source: MaintenanceHistorySource | null
  source_type: 'task' | 'finding' | 'maintenance_decision' | 'part_replacement_request' | 'part_repair'
  source_id: number
}

export interface MaintenanceHistoryFilters {
  equipment_id?: number
  part_id?: number
  event_type?: MaintenanceHistoryEventType
  date_from?: string
  date_to?: string
}
