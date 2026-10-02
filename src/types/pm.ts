export type TaskLibraryScheduleType = 'calendar' | 'runtime'

export interface TaskLibraryPart {
  id: number
  task_library_id: number
  part_id: number
  part_name?: string | null
  item_master_no?: string | null
  quantity_required: number
  notes: string | null
}

export interface TaskLibraryChecklistItem {
  id: number
  description: string
  order: number
}

export interface TaskLibrary {
  id: number
  code: string
  equipment_id: number
  equipment_name?: string
  machine_name?: string
  line_id?: number
  line_name?: string
  title: string
  description: string | null
  schedule_type: TaskLibraryScheduleType | null
  interval_days: number | null
  interval_hours: number | null
  estimated_duration_minutes: number | null
  is_active: boolean
  parts: TaskLibraryPart[]
  checklist_items: TaskLibraryChecklistItem[]
  created_at: string
}

export interface TaskPartCheck {
  id: number
  part_id: number
  part_name?: string | null
  item_master_no?: string | null
  quantity_planned: number
  is_replaced: boolean | null
  quantity_used: number | null
  reason: string | null
  part_installation_id: number | null
  /** Only ever set for a row that was actually replaced — a "not replaced" row never recorded which physical unit/address it was. */
  slot_label?: string | null
  /** "Part Passport" — when true, WoCard must resolve this row's part_unit_id via a QR camera scan instead of the plain auto-pick checkbox. */
  has_passport?: boolean
}

export interface TaskReschedule {
  id: number
  task_id: number
  task_title?: string | null
  equipment_name?: string | null
  previous_due_date: string | null
  new_due_date: string
  reason: string | null
  rescheduled_by_name?: string | null
  created_at: string
}
