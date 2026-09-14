export interface ProductionLine {
  id: number
  branch_id: number
  code: string
  name: string
  runtime_hours: number
  is_active: boolean
}

export interface Machine {
  id: number
  line_id: number
  code: string
  name: string
  category: string | null
  is_active: boolean
}

export interface Equipment {
  id: number
  machine_id: number
  code: string
  name: string
  category: string | null
  is_active: boolean
}

export type ScheduleType = 'calendar' | 'runtime' | 'unscheduled'

export interface WorkOrder {
  id: number
  equipment_id: number
  part_id: number | null
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
  equipment_id: number
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
  quantity_used: number | null
  is_overdue: boolean
  created_at: string
}
