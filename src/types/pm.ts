export type TaskLibraryScheduleType = 'calendar' | 'runtime'

/**
 * What kind of planned maintenance activity a recipe represents — separate
 * from TaskLibraryScheduleType (how/when). null means a legacy recipe that
 * existed before this field and hasn't been classified yet (see the
 * backend migration for why it isn't guessed).
 */
export type TaskLibraryMaintenanceCategory = 'life_time' | 'scheduled_maintenance' | 'inspection'

export interface TaskLibraryPart {
  id: number
  task_library_id: number
  part_id: number
  part_name?: string | null
  item_master_no?: string | null
  quantity_required: number
  notes: string | null
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
  maintenance_category: TaskLibraryMaintenanceCategory | null
  schedule_type: TaskLibraryScheduleType | null
  interval_days: number | null
  interval_hours: number | null
  estimated_duration_minutes: number | null
  is_active: boolean
  parts: TaskLibraryPart[]
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
