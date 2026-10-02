export interface Unit {
  id: number
  name: string
}

export type PartReplacementStrategy = 'life_based' | 'failure_based' | 'scheduled'

/** How a Part's effective minimum_stock (per branch) is determined — see PartStockController::attachComputedAttributes(). 'standard' (the safe default) reads the branch's own "Standar Minimum Plant"; 'installed' reads that part's own active_installation_count in that branch instead. */
export type PartMinimumStockStrategy = 'installed' | 'standard'

export interface Part {
  id: number
  item_master_no: string
  name: string
  description: string | null
  unit: string
  price: string
  estimated_lifetime_hours: number | null
  replacement_strategy: PartReplacementStrategy
  minimum_stock_strategy: PartMinimumStockStrategy
  image_url: string | null
  is_active: boolean
  /** "Part Passport" — Stock In for this Part immediately creates one tracked PartUnit (QR + arrival date) per quantity received, instead of only at first install. */
  has_passport: boolean
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
  minimum_stock_strategy?: PartMinimumStockStrategy
  branch_id: number
  branch_name?: string
  supplier_id: number | null
  supplier_name?: string | null
  location_id: number | null
  location_code?: string | null
  /** Computed, not stored — see PartMinimumStockStrategy. */
  minimum_stock: number
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

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    total: number
  }
}
