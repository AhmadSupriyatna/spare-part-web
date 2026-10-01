export type UserRole = 'engineer' | 'admin_spare_part' | 'supervisor' | 'superadmin'

export interface Branch {
  id: number
  code: string
  name: string
  address?: string | null
  is_active?: boolean
  /** "Standar Minimum Plant" — this Plant's default minimum_stock for a Part whose minimum_stock_strategy is 'standard'. */
  default_minimum_stock?: number
}

export interface AuthUser {
  id: number
  name: string
  email: string
  avatar_url: string | null
  roles: UserRole[]
  branches: Branch[]
}

export interface LoginPayload {
  email: string
  password: string
  device_name: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}
