import type { UserRole } from '@/types/auth'

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  supervisor: 'Supervisor/Manager',
  admin_spare_part: 'Admin Spare Part',
  engineer: 'Engineer',
}

export const ROLE_OPTIONS: UserRole[] = ['superadmin', 'supervisor', 'admin_spare_part', 'engineer']

/** Every role except Superadmin is confined to whichever branches are assigned to the account. */
export function roleNeedsBranches(role: UserRole): boolean {
  return role !== 'superadmin'
}
