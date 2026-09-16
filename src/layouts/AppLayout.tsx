import { useMutation } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  CalendarCog,
  ClipboardList,
  Factory,
  Hammer,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  NotebookPen,
  NotebookText,
  Package,
  QrCode,
  Ruler,
  Settings,
  ShieldCheck,
  Truck,
  Warehouse,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { BranchSelector } from '@/components/BranchSelector'
import { GlobalSearch } from '@/components/GlobalSearch'
import { ProfileMenu } from '@/components/ProfileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { logout as logoutRequest } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSheetStackStore } from '@/stores/sheet-stack-store'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

interface NavSection {
  label?: string
  /** Only needed for a section with more than one item — it becomes the one icon shown for the whole group. */
  icon?: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Inventaris',
    icon: Warehouse,
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
    icon: Factory,
    items: [
      { to: '/branches', label: 'Cabang', icon: Building2 },
      { to: '/lines', label: 'Line Equipment', icon: Factory },
    ],
  },
  {
    label: 'Kerja Saya',
    items: [{ to: '/my-tasks', label: 'Tugas Saya', icon: ClipboardList }],
  },
  {
    label: 'Perawatan (PM & WO)',
    icon: Wrench,
    items: [
      { to: '/work-orders', label: 'Work Order', icon: CalendarCog },
      { to: '/task-libraries', label: 'Task Library', icon: NotebookPen },
      { to: '/part-lifetime', label: 'Part Lifetime', icon: HeartPulse },
      { to: '/part-repairs', label: 'Perbaikan Part', icon: Hammer },
      { to: '/pm/calendar', label: 'Kalender PM', icon: CalendarClock },
      { to: '/pm/ledger', label: 'Ledger WO', icon: NotebookText },
    ],
  },
  {
    label: 'Breakdown',
    icon: AlertTriangle,
    items: [
      { to: '/breakdown/approvals', label: 'Papan Approval', icon: ShieldCheck },
      { to: '/breakdown/print-qr', label: 'Cetak QR Code', icon: QrCode },
    ],
  },
  {
    label: 'Pengaturan',
    icon: Settings,
    items: [
      { to: '/settings/company', label: 'Profil Perusahaan', icon: Settings },
      { to: '/settings/units', label: 'Satuan Part', icon: Ruler },
    ],
  },
]

const navIconButtonClass = 'flex size-11 shrink-0 items-center justify-center rounded-md transition-colors'
const navIconButtonActiveClass = 'bg-sidebar-primary/10 text-sidebar-primary'
const navIconButtonInactiveClass = 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const sheetOpenCount = useSheetStackStore((state) => state.openCount)
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearSession()
      navigate('/login', { replace: true })
    },
  })

  function isItemActive(item: NavItem) {
    return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <aside className="hidden h-full w-16 shrink-0 flex-col items-center border-r bg-sidebar text-sidebar-foreground sm:flex">
        <div className="flex items-center justify-center py-5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            title="Spare Part — Sistem Manajemen"
          >
            <Wrench className="size-4" />
          </div>
        </div>

        <nav className="scroll-thin flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 pb-4">
          {navSections.map((section) => {
            const isGroup = Boolean(section.label) && section.items.length > 1

            if (!isGroup) {
              const item = section.items[0]
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(navIconButtonClass, isActive ? navIconButtonActiveClass : navIconButtonInactiveClass)
                  }
                >
                  <item.icon className="size-5" />
                </NavLink>
              )
            }

            const SectionIcon = section.icon ?? section.items[0].icon
            const isGroupActive = section.items.some(isItemActive)

            return (
              <Popover
                key={section.label}
                open={openGroup === section.label}
                onOpenChange={(next) => setOpenGroup(next ? (section.label as string) : null)}
              >
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      title={section.label}
                      className={cn(
                        navIconButtonClass,
                        isGroupActive ? navIconButtonActiveClass : navIconButtonInactiveClass,
                      )}
                    />
                  }
                >
                  <SectionIcon className="size-5" />
                </PopoverTrigger>
                <PopoverContent side="right" align="start" sideOffset={12} className="w-56">
                  <p className="px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {section.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpenGroup(null)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-sidebar-primary/10 text-sidebar-primary'
                              : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                          )
                        }
                      >
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-4 border-b bg-background/95 px-6 py-3 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex flex-1 items-center">
            <BranchSelector />
          </div>
          <div className="flex flex-1 justify-center">
            <GlobalSearch />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Notifikasi"
              title="Notifikasi"
              onClick={() => toast.info('Fitur notifikasi akan segera hadir.')}
            >
              <Bell />
            </Button>
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              onLogout={() => mutation.mutate()}
              isLoggingOut={mutation.isPending}
            />
          </div>
        </header>
        <Separator />
        <main
          className={cn(
            'flex-1 overflow-y-auto p-6 transition-[margin-right] duration-300',
            sheetOpenCount > 0 && 'mr-96',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
