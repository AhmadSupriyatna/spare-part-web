import { useAuthStore } from '@/stores/auth-store'
import type { UserRole } from '@/types/auth'

export function useHasRole(roles: UserRole[]): boolean {
  const userRoles = useAuthStore((state) => state.user?.roles ?? [])
  return userRoles.some((role) => roles.includes(role))
}

export function useCanManage(): boolean {
  return useHasRole(['admin_spare_part', 'superadmin'])
}

/**
 * BOM and Task Library (PM recipes) — Engineer's turf alongside Admin Spare
 * Part/Superadmin, narrower than full master-data management above and
 * mirroring the `admin_spare_part|engineer|superadmin` route group on the
 * backend.
 */
export function useCanManageEngineering(): boolean {
  return useHasRole(['admin_spare_part', 'engineer', 'superadmin'])
}

/**
 * Breakdown replacement / part-unit-action approval boards, mirroring the
 * `engineer|supervisor|superadmin` route group on the backend.
 */
export function useCanApprove(): boolean {
  return useHasRole(['engineer', 'supervisor', 'superadmin'])
}

/**
 * Managing other people's accounts (role, branches, password, active
 * status) — mirrors the `role:superadmin` route group on the backend,
 * the one "kelola" action kept narrower than every other manage role.
 */
export function useIsSuperadmin(): boolean {
  return useHasRole(['superadmin'])
}
