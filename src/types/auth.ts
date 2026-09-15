export type UserRole = 'teknisi' | 'engineer' | 'admin_spare_part' | 'supervisor' | 'superadmin'

export interface Branch {
  id: number
  code: string
  name: string
  address?: string | null
  is_active?: boolean
}

export interface AuthUser {
  id: number
  name: string
  email: string
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
