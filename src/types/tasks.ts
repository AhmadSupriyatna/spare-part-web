import type { TaskPartCheck } from '@/types/pm'

export interface ProductionLine {
  id: number
  branch_id: number
  code: string
  name: string
  runtime_hours: number
  /** Overrides the company-wide default (Settings) for this line's Life Based due-date/budget projections — null falls back to that default. */
  avg_weekly_operating_hours: number | null
  is_active: boolean
}

export interface LineRuntimeLog {
  id: number
  line_id: number
  previous_hours: number
  new_hours: number
  hours_added: number
  recorded_by_name: string | null
  notes: string | null
  created_at: string
}

export interface Machine {
  id: number
  /** null for an outside-line machine ("Mesin Luar Line") — see branch_id instead. */
  line_id: number | null
  line_name?: string
  /** Set only when line_id is null. */
  branch_id?: number | null
  branch_name?: string | null
  code: string
  name: string
  category: string | null
  is_active: boolean
}

export interface Equipment {
  id: number
  /** null for an outside-line asset — see branch_id instead. */
  machine_id: number | null
  machine_name?: string
  line_id?: number
  line_name?: string
  /** Phase 3B "Asset Outside Line" — set only when machine_id is null. */
  branch_id?: number | null
  branch_name?: string | null
  code: string
  /** {line.code}-{machine.code}-{equipment.code} for production, OL-{code} for an outside-line asset. Only present when the backend eager-loaded `machine`/`branch` (e.g. the single-equipment "show" endpoint) or the asset is outside-line (cheap, no relation needed) — not on a production list response. */
  hierarchical_code?: string
  name: string
  category: string | null
  is_active: boolean
}

export type ScheduleType = 'calendar' | 'runtime' | 'unscheduled'

export interface WorkOrder {
  id: number
  equipment_id: number
  equipment_name?: string
  machine_name?: string
  line_id?: number
  line_name?: string
  part_id: number | null
  part_name?: string | null
  title: string
  description: string | null
  schedule_type: ScheduleType
  interval_days: number | null
  interval_hours: number | null
  is_active: boolean
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface Task {
  id: number
  work_order_id: number | null
  task_library_id: number | null
  equipment_id: number
  equipment_name?: string
  machine_name?: string
  line_name?: string
  branch_name?: string
  assigned_to: number | null
  assignee_name?: string | null
  title: string
  description: string | null
  status: TaskStatus
  cause: string | null
  due_date: string | null
  due_runtime_hours: number | null
  started_at: string | null
  completed_at: string | null
  completion_notes: string | null
  part_stock_id: number | null
  part_name?: string | null
  item_master_no?: string | null
  quantity_used: number | null
  part_checks?: TaskPartCheck[]
  is_overdue: boolean
  created_at: string
}
