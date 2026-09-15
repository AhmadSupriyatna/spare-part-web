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

export interface PartInstallation {
  id: number
  equipment_id: number
  equipment_name?: string
  machine_id?: number
  machine_name?: string
  line_id?: number
  line_name?: string
  part_id: number
  part_name: string
  item_master_no: string
  part_unit_id: number | null
  unit_code?: string | null
  estimated_lifetime_hours?: number | null
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

export type PartUnitStatus = 'in_service' | 'pending_repair' | 'in_repair' | 'available' | 'scrapped'

export interface PartUnit {
  id: number
  part_id: number
  part_name?: string
  item_master_no?: string
  unit_code: string | null
  status: PartUnitStatus
  total_runtime_hours_used: number
  estimated_lifetime_hours: number | null
  percent_used: number | null
  install_count: number
  installations?: PartInstallation[]
  repairs?: PartRepair[]
  created_at: string
}

export type PartRepairDisposition = 'pending' | 'in_repair' | 'repaired' | 'scrapped'

export interface PartRepair {
  id: number
  part_unit_id: number
  unit_code?: string | null
  part_name?: string | null
  item_master_no?: string | null
  part_installation_id: number | null
  equipment_name?: string | null
  machine_name?: string | null
  line_name?: string | null
  removed_at: string
  disposition: PartRepairDisposition
  repaired_at: string | null
  notes: string | null
  reinstalled_installation_id: number | null
  created_at: string
}
