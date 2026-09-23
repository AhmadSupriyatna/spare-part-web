import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Preserves the page someone was trying to reach (e.g. a Line's QR-code
 * runtime-log page) as router state, so LoginPage can send them back there
 * instead of always landing on the Dashboard — matters for a QR scan that's
 * meant to be a quick in-and-out action.
 */
export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
