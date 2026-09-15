import type { PartUnitStatus } from '@/types/relations'

export type PartUnitAction = 'remove' | 'reinstall'
export type PartUnitActionRequestStatus = 'pending' | 'approved' | 'rejected'

export interface PublicPartUnit {
  id: number
  unit_code: string | null
  status: PartUnitStatus
  part_id: number
  part_name: string
  item_master_no: string
  part_image_url: string | null
  current_equipment: {
    id: number
    name: string
    machine_name: string
    line_name: string
  } | null
}

export interface PartUnitActionRequest {
  id: number
  action: PartUnitAction
  part_unit_id: number
  unit_code: string | null
  part_name: string | null
  item_master_no: string | null
  equipment_id: number
  equipment_name: string | null
  machine_name: string | null
  line_name: string | null
  requested_by_name: string
  notes: string | null
  status: PartUnitActionRequestStatus
  reviewed_by_name: string | null
  review_notes: string | null
  created_at: string
}
