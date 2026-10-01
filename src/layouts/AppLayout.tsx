import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  DatabaseBackup,
  Factory,
  FileText,
  FileWarning,
  Hammer,
  History,
  LayoutDashboard,
  List,
  MapPin,
  NotebookPen,
  QrCode,
  Ruler,
  Settings,
  ShieldCheck,
  Truck,
  UserRoundCog,
  Wallet,
  Warehouse,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { BranchSelector } from '@/components/BranchSelector'
import { GlobalSearch } from '@/components/GlobalSearch'
import { ProfileMenu } from '@/components/ProfileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { logout as logoutRequest } from '@/features/auth/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSheetStackStore } from '@/stores/sheet-stack-store'
import type { UserRole } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  /** Omit to show for everyone — only Kelola Pengguna is currently restricted. */
  roles?: UserRole[]
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
    label: 'Kelola Stok',
    icon: Warehouse,
    items: [
      { to: '/stock', label: 'Stok & Part', icon: Boxes },
      { to: '/stock/ledger', label: 'Ledger Stok', icon: ArrowLeftRight },
      { to: '/suppliers', label: 'Supplier', icon: Truck },
      { to: '/locations', label: 'Lokasi', icon: MapPin },
    ],
  },
  {
    items: [
      {
        to: '/budgets',
        label: 'Budget',
        icon: Wallet,
        roles: ['superadmin', 'supervisor', 'admin_spare_part'],
      },
    ],
  },
  {
    label: 'Aset & Produksi',
    icon: Factory,
    items: [
      { to: '/branches', label: 'Plant', icon: Building2 },
      { to: '/lines', label: 'Line Equipment', icon: Factory },
      { to: '/lines/report', label: 'Laporan', icon: FileText },
    ],
  },
  {
    label: 'Workspace',
    icon: ClipboardList,
    items: [
      {
        to: '/workspace',
        label: 'Task & Request',
        icon: ClipboardList,
        roles: ['superadmin', 'supervisor', 'engineer'],
      },
      { to: '/fp3', label: 'Riwayat Request', icon: FileWarning },
    ],
  },
  {
    items: [
      {
        to: '/approval',
        label: 'Approval',
        icon: ShieldCheck,
        roles: ['superadmin', 'supervisor', 'engineer'],
      },
    ],
  },
  {
    items: [{ to: '/task-libraries', label: 'Task Library', icon: NotebookPen }],
  },
  {
    label: 'Maintenance',
    icon: Wrench,
    items: [
      { to: '/pm/calendar?tab=calendar', label: 'Kalender', icon: CalendarDays, end: true },
      { to: '/pm/calendar?tab=list', label: 'WO', icon: List, end: true },
      { to: '/pm/calendar?tab=report', label: 'Laporan', icon: FileText, end: true },
      { to: '/pm/calendar?tab=repair', label: 'Repair Part', icon: Hammer, end: true },
    ],
  },
  {
    items: [{ to: '/breakdown/print-qr', label: 'Cetak QR Code', icon: QrCode }],
  },
  {
    label: 'Pengaturan',
    icon: Settings,
    items: [
      { to: '/settings/company', label: 'Profil Perusahaan', icon: Settings },
      { to: '/settings/units', label: 'Satuan Part', icon: Ruler },
      { to: '/settings/departments', label: 'Departemen', icon: Building2 },
      { to: '/settings/users', label: 'Kelola Pengguna', icon: UserRoundCog, roles: ['superadmin'] },
      {
        to: '/settings/activity-log',
        label: 'Log Aktivitas',
        icon: History,
        roles: ['admin_spare_part', 'supervisor', 'superadmin'],
      },
      {
        to: '/settings/backup',
        label: 'Backup & Restore',
        icon: DatabaseBackup,
        roles: ['superadmin'],
      },
    ],
  },
]

const navIconButtonClass = 'relative flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors'
/** The left accent bar reads like a control-panel indicator lamp next to whichever icon is "on". */
const navIconButtonActiveClass =
  "bg-sidebar-primary/10 text-sidebar-primary after:absolute after:top-1/2 after:left-0 after:h-5 after:w-[3px] after:-translate-y-1/2 after:rounded-r-full after:bg-warning after:content-['']"
const navIconButtonInactiveClass = 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const sheetOpenCount = useSheetStackStore((state) => state.openCount)
  const userRoles = useAuthStore((state) => state.user?.roles ?? [])
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    document.title = companySetting?.app_name ?? 'Sistem Manajemen Spare Part'
  }, [companySetting?.app_name])

  const visibleNavSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.roles || item.roles.some((r) => userRoles.includes(r))),
        }))
        .filter((section) => section.items.length > 0),
    [userRoles],
  )

  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearSession()
      navigate('/login', { replace: true })
    },
  })

  function pathMatches(item: NavItem) {
    const [path, search] = item.to.split('?')
    const matchesLocation = item.end
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`)
    if (!matchesLocation) return false
    return !search || location.search.replace(/^\?/, '') === search
  }

  /**
   * Longest-prefix-wins within a group: without this, "Ledger Stok"
   * (/stock/ledger) also lit up "Stok & Part" (/stock) since the latter is
   * a plain prefix of the former's path — both used to show active at once.
   */
  function isItemActive(item: NavItem, siblings: NavItem[]) {
    if (!pathMatches(item)) return false
    return !siblings.some((other) => other !== item && pathMatches(other) && other.to.length > item.to.length)
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <aside className="hidden h-full w-16 shrink-0 flex-col items-center border-r bg-sidebar text-sidebar-foreground sm:flex">
        <div className="h-[3px] w-full shrink-0 bg-warning" />
        <div className="flex items-center justify-center py-4">
          {companySetting?.app_logo_url ? (
            <img
              src={companySetting.app_logo_url}
              alt={companySetting.app_name}
              title={companySetting.app_name}
              className="size-8 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              title={companySetting?.app_name ?? 'Sistem Manajemen Spare Part'}
            >
              <Wrench className="size-4" />
            </div>
          )}
        </div>

        <nav className="scroll-thin flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 pb-4">
          {visibleNavSections.map((section) => {
            const isGroup = Boolean(section.label) && section.items.length > 1

            if (!isGroup) {
              const item = section.items[0]
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger
                    render={
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(navIconButtonClass, isActive ? navIconButtonActiveClass : navIconButtonInactiveClass)
                        }
                      />
                    }
                  >
                    <item.icon className="size-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            const SectionIcon = section.icon ?? section.items[0].icon
            const isGroupActive = section.items.some((item) => isItemActive(item, section.items))

            return (
              <Popover
                key={section.label}
                open={openGroup === section.label}
                onOpenChange={(next) => setOpenGroup(next ? (section.label as string) : null)}
              >
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              navIconButtonClass,
                              isGroupActive ? navIconButtonActiveClass : navIconButtonInactiveClass,
                            )}
                          />
                        }
                      />
                    }
                  >
                    <SectionIcon className="size-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {section.label}
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="right" align="start" sideOffset={12} className="w-56">
                  <div className="mb-1 border-b border-warning/30 px-2 pb-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {section.label}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpenGroup(null)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                          isItemActive(item, section.items)
                            ? 'bg-sidebar-primary/10 text-sidebar-primary'
                            : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                        )}
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
        <header className="flex shrink-0 items-center gap-4 border-b-2 border-warning/40 bg-background/95 px-6 py-3 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex flex-1 items-center gap-2.5">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
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
              avatarUrl={user?.avatar_url}
              onLogout={() => mutation.mutate()}
              isLoggingOut={mutation.isPending}
            />
          </div>
        </header>
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
