import { useAuthStore } from '@/stores/auth-store'
import type { UserRole } from '@/types/auth'

export function useHasRole(roles: UserRole[]): boolean {
  const userRoles = useAuthStore((state) => state.user?.roles ?? [])
  return userRoles.some((role) => roles.includes(role))
}

export function useCanManage(): boolean {
  return useHasRole(['admin_gudang', 'supervisor', 'superadmin'])
}
