import { useMutation } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { BranchSelector } from '@/components/BranchSelector'
import { logout as logoutRequest } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/parts', label: 'Part' },
  { to: '/stock', label: 'Stok' },
  { to: '/alerts', label: 'Peringatan' },
  { to: '/suppliers', label: 'Supplier' },
  { to: '/locations', label: 'Lokasi' },
  { to: '/lines', label: 'Line & Mesin' },
  { to: '/my-tasks', label: 'Tugas Saya' },
]

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
    <div className="flex min-h-svh">
      <aside className="hidden w-56 shrink-0 flex-col border-r p-4 sm:flex">
        <span className="mb-6 px-2 font-semibold">Spare Part</span>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                  isActive && 'bg-muted text-foreground',
                  !isActive && 'text-muted-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <BranchSelector />
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
    </div>
  )
}
