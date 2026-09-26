export interface Unit {
  id: number
  name: string
}

export type PartReplacementStrategy = 'life_based' | 'failure_based' | 'scheduled'

export interface Part {
  id: number
  item_master_no: string
  name: string
  description: string | null
  unit: string
  price: string
  estimated_lifetime_hours: number | null
  replacement_strategy: PartReplacementStrategy
  image_url: string | null
  is_active: boolean
  stocks?: PartStock[]
  created_at: string
  updated_at: string
}

export interface PartStock {
  id: number
  part_id: number
  part_name?: string
  item_master_no?: string
  replacement_strategy?: PartReplacementStrategy
  branch_id: number
  branch_name?: string
  supplier_id: number | null
  supplier_name?: string | null
  location_id: number | null
  location_code?: string | null
  minimum_stock: number
  reorder_point: number
  reorder_quantity: number
  unit_cost: string
  quantity_on_hand: number
  /** Not yet subtracted from quantity_on_hand — spoken for by a still-open Task (see PartStockController::attachComputedAttributes()). */
  reserved_quantity: number
  /** quantity_on_hand - reserved_quantity, never negative. */
  available_quantity: number
  /** How many of this branch's equipment currently have this part installed. */
  active_installation_count: number
  /** available_quantity < reserved_quantity — can't cover what's already committed to open WOs. */
  is_critical: boolean
  /** available_quantity < active_installation_count (and not already critical) — couldn't cover every installed unit failing at once. */
  is_warning: boolean
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
  rack_level_id: number
  bin_number: number
  code: string
  rack_label?: string
  level_number?: number
  description: string | null
  is_active: boolean
  part_stocks_count?: number
}

export interface RackLevel {
  id: number
  rack_id: number
  level_number: number
  code: string
  locations: Location[]
}

export interface Rack {
  id: number
  branch_id: number
  label: string
  levels: RackLevel[]
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

export interface StockAlert {
  id: number
  part_stock_id: number
  part_name: string
  item_master_no: string
  level: 'low' | 'critical'
  quantity_on_hand_at_trigger: number
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
}

export type ReorderStatus = 'pending' | 'approved' | 'ordered' | 'completed' | 'cancelled'

export interface ReorderRequest {
  id: number
  part_stock_id: number
  part_name: string
  item_master_no: string
  supplier_id: number | null
  supplier_name: string | null
  quantity_requested: number
  status: ReorderStatus
  requested_by: number | null
  requested_by_name: string | null
  approved_by: number | null
  approved_by_name: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    total: number
  }
}
