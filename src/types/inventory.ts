export interface Part {
  id: number
  item_master_no: string
  name: string
  description: string | null
  unit: string
  category: string | null
  price: string
  image_url: string | null
  is_active: boolean
  stocks?: PartStock[]
  created_at: string
  updated_at: string
}

export interface PartStock {
  id: number
  part_id: number
  branch_id: number
  branch_name?: string
  supplier_id: number | null
  location_id: number | null
  location_code?: string | null
  minimum_stock: number
  reorder_point: number
  reorder_quantity: number
  unit_cost: string
  quantity_on_hand: number
  is_below_reorder_point: boolean
  is_critical: boolean
}

export interface Supplier {
  id: number
  branch_id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
}

export interface Location {
  id: number
  branch_id: number
  code: string
  rack: string
  bin: string
  description: string | null
  is_active: boolean
}

export interface StockLedgerEntry {
  id: number
  type: string
  quantity_change: number
  balance_after: number
  notes: string | null
  user: { id: number; name: string } | null
  occurred_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    total: number
  }
}
