export type UserRole = 'teknisi' | 'admin_gudang' | 'supervisor' | 'superadmin'

export interface AuthUser {
  id: number
  name: string
  email: string
  roles: UserRole[]
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
