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
  equipment_id: number
  equipment_name?: string
  machine_name?: string
  line_id?: number
  line_name?: string
  title: string
  description: string | null
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
}
