import { useMutation } from '@tanstack/react-query'
import { Outlet, useNavigate } from 'react-router'
import { logout as logoutRequest } from '@/features/auth/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function AppLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)

  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearSession()
      navigate('/login', { replace: true })
    },
  })

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Sistem Manajemen Spare Part</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={() => mutation.mutate()}>
            Keluar
          </Button>
        </div>
      </header>
      <Separator />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
