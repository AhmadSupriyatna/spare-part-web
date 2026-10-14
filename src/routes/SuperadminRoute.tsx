import { Navigate, Outlet } from 'react-router'
import { useIsSuperadmin } from '@/stores/use-has-role'

export function SuperadminRoute() {
  const isSuperadmin = useIsSuperadmin()

  return isSuperadmin ? <Outlet /> : <Navigate to="/" replace />
}
