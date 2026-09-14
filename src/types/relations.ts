export interface PartSupplier {
  id: number
  part_id: number
  part_name?: string
  item_master_no?: string
  supplier_id: number
  supplier_name: string
  branch_id: number
  branch_name: string
  price: string | null
  lead_time_days: number | null
  is_preferred: boolean
  notes: string | null
}

export interface EquipmentPart {
  id: number
  equipment_id: number
  equipment_name?: string
  machine_name?: string
  line_name?: string
  part_id: number
  part_name?: string
  item_master_no?: string
  quantity_required: number | null
  notes: string | null
}

export interface PartInstallation {
  id: number
  equipment_id: number
  equipment_name?: string
  machine_name?: string
  line_name?: string
  part_id: number
  part_name: string
  item_master_no: string
  installed_at: string
  installed_at_runtime_hours: number | null
  removed_at: string | null
  removed_at_runtime_hours: number | null
  installed_by_name: string | null
  notes: string | null
  is_active: boolean
  age_in_days: number
  age_in_runtime_hours: number | null
  expected_interval_days: number | null
  expected_interval_hours: number | null
  percent_used: number | null
}
