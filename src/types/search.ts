export interface SearchPartResult {
  id: number
  name: string
  item_master_no: string
}

export interface SearchEquipmentResult {
  id: number
  name: string
  code: string
  machine_id: number
  machine_name: string
  line_id: number
  line_name: string
}

export interface SearchSupplierResult {
  id: number
  name: string
}

export interface SearchLocationResult {
  id: number
  code: string
  description: string | null
}

export interface GlobalSearchResults {
  parts: SearchPartResult[]
  equipment: SearchEquipmentResult[]
  suppliers: SearchSupplierResult[]
  locations: SearchLocationResult[]
}
