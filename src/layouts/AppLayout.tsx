import { useMutation } from '@tanstack/react-query'
import {
  AlertTriangle,
  Boxes,
  Building2,
  ClipboardList,
  Factory,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  QrCode,
  Ruler,
  Settings,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { BranchSelector } from '@/components/BranchSelector'
import { logout as logoutRequest } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Inventaris',
    items: [
      { to: '/parts', label: 'Part', icon: Package },
      { to: '/stock', label: 'Stok', icon: Boxes },
      { to: '/alerts', label: 'Peringatan', icon: AlertTriangle },
      { to: '/suppliers', label: 'Supplier', icon: Truck },
      { to: '/locations', label: 'Lokasi', icon: MapPin },
    ],
  },
  {
    label: 'Aset & Produksi',
    items: [
      { to: '/branches', label: 'Cabang', icon: Building2 },
      { to: '/lines', label: 'Line, Mesin & Equipment', icon: Factory },
    ],
  },
  {
    label: 'Kerja Saya',
    items: [{ to: '/my-tasks', label: 'Tugas Saya', icon: ClipboardList }],
  },
  {
    label: 'Breakdown',
    items: [
      { to: '/breakdown/approvals', label: 'Papan Approval', icon: ShieldCheck },
      { to: '/breakdown/print-qr', label: 'Cetak QR Code', icon: QrCode },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { to: '/settings/company', label: 'Profil Perusahaan', icon: Settings },
      { to: '/settings/units', label: 'Satuan Part', icon: Ruler },
    ],
  },
]

function initials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

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
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground sm:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Spare Part</p>
            <p className="text-xs text-muted-foreground">Sistem Manajemen</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
          {navSections.map((section, index) => (
            <div key={section.label ?? index} className="flex flex-col gap-1">
              {section.label && (
                <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b bg-background/95 px-6 py-3 backdrop-blur supports-backdrop-filter:bg-background/60">
          <BranchSelector />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(user?.name)}
              </div>
              <span className="text-sm font-medium">{user?.name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutation.mutate()}>
              <LogOut className="size-3.5" />
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
