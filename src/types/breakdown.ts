export type ReplacementRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ReplacementRequest {
  id: number
  part_id: number
  part_name: string
  item_master_no: string
  part_image_url: string | null
  equipment_id: number
  equipment_name: string
  machine_name: string
  line_name: string
  branch_name: string
  quantity_used: number
  requested_by_name: string
  reason: string | null
  status: ReplacementRequestStatus
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
}

export interface PublicBranch {
  id: number
  code: string
  name: string
}

export interface PublicLine {
  id: number
  name: string
}

export interface PublicMachine {
  id: number
  name: string
}

export interface PublicEquipment {
  id: number
  name: string
}

export interface PublicPart {
  id: number
  item_master_no: string
  name: string
  description: string | null
  unit: string
  category: string | null
  image_url: string | null
}
