import type { TaskPartCheck } from '@/types/pm'

export interface TaskChecklistItem {
  id: number
  description: string
  condition_ok: boolean | null
  notes: string | null
}

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

export interface LineKwhLog {
  id: number
  line_id: number
  /** Monday of the calendar week this entry is for — one entry per (line, week), YYYY-MM-DD. */
  week_start_date: string
  mode: 'reading' | 'direct'
  /** Only set when mode is 'reading'. */
  previous_reading: number | null
  new_reading: number | null
  kwh_used: number
  /** kVA is optional on every entry — all three stay null when it wasn't submitted. Only previous/new_kva_reading are reading-mode-only, same as their kWh counterparts. */
  previous_kva_reading: number | null
  new_kva_reading: number | null
  kva_used: number | null
  /** Power Factor = kwh_used / kva_used, derived server-side — never an input field. Null whenever kva_used is null or 0. */
  pf: number | null
  recorded_by_name: string | null
  notes: string | null
  created_at: string
}

/** "Laporan kWh" — one row per Line, totaled for a chosen calendar month. */
export interface LineKwhReportRow {
  line_id: number
  line_code: string
  line_name: string
  total_kwh: number
  entry_count: number
}

/** "Laporan Running Hours Line" — one row per Line, for a chosen calendar month. hours_at_start/end are contextual only (null when no reading exists yet at that point); hours_added is always the exact sum for the month. */
export interface LineRuntimeReportRow {
  line_id: number
  line_code: string
  line_name: string
  hours_at_start: number | null
  hours_at_end: number | null
  hours_added: number
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
  checklist_items?: TaskChecklistItem[]
  is_overdue: boolean
  created_at: string
}
