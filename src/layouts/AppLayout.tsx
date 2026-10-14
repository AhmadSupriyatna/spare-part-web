import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  DatabaseBackup,
  Factory,
  FileText,
  Hammer,
  History,
  LayoutDashboard,
  List,
  MapPin,
  MoreHorizontal,
  NotebookPen,
  QrCode,
  Ruler,
  Settings,
  ShieldCheck,
  Truck,
  Tags,
  UserRoundCog,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BranchSelector } from '@/components/BranchSelector'
import { GlobalSearch } from '@/components/GlobalSearch'
import { ProfileFormDialog } from '@/components/ProfileFormDialog'
import { ProfileMenu } from '@/components/ProfileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { logout as logoutRequest } from '@/features/auth/api'
import { NotificationsPopover } from '@/features/notifications/NotificationsPopover'
import { fetchCompanySetting } from '@/features/settings/api'
import { HeaderExtraSlotProvider } from '@/layouts/HeaderExtraSlot'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSheetStackStore } from '@/stores/sheet-stack-store'
import type { UserRole } from '@/types/auth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  subgroup?: string
  /** Omit to show for everyone. */
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
    label: 'Inventory & Assets',
    icon: Factory,
    items: [
      { to: '/stock', label: 'Parts Inventory', icon: Boxes, subgroup: 'Stock Management' },
      { to: '/stock/ledger', label: 'Stock Transactions', icon: ArrowLeftRight, subgroup: 'Stock Management' },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, subgroup: 'Stock Management' },
      { to: '/locations', label: 'Locations', icon: MapPin, subgroup: 'Stock Management' },
      { to: '/branches', label: 'Plants', icon: Building2, roles: ['superadmin'], subgroup: 'Assets & Production' },
      {
        to: '/lines',
        label: 'Production Lines',
        icon: Factory,
        roles: ['superadmin'],
        subgroup: 'Assets & Production',
      },
    ],
  },
  {
    items: [
      {
        to: '/budgets',
        label: 'Budgets',
        icon: Wallet,
        roles: ['superadmin', 'supervisor', 'admin_spare_part'],
      },
    ],
  },
  {
    label: 'Workspace',
    icon: ClipboardList,
    items: [
      {
        to: '/workspace',
        label: 'Tasks & Requests',
        icon: ClipboardList,
        roles: ['superadmin', 'supervisor', 'engineer'],
      },
    ],
  },
  {
    items: [
      {
        to: '/approval',
        label: 'Approvals',
        icon: ShieldCheck,
        roles: ['superadmin', 'supervisor', 'engineer'],
      },
    ],
  },
  {
    label: 'Maintenance',
    icon: Wrench,
    items: [
      { to: '/pm/calendar?tab=library', label: 'Task Library', icon: NotebookPen },
      { to: '/pm/calendar?tab=calendar', label: 'Schedule', icon: CalendarDays, end: true },
      { to: '/pm/calendar?tab=list', label: 'Work Order List', icon: List, end: true },
      { to: '/pm/calendar?tab=repair', label: 'Part Repairs', icon: Hammer, end: true },
    ],
  },
  {
    items: [{ to: '/breakdown/print-qr', label: 'Print QR Codes', icon: QrCode }],
  },
  {
    label: 'Reports',
    icon: FileText,
    items: [{ to: '/reports', label: 'All Reports', icon: FileText }],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      { to: '/settings/company', label: 'Company Profile', icon: Settings, roles: ['superadmin'] },
      { to: '/settings/units', label: 'Units of Measure', icon: Ruler, roles: ['superadmin'] },
      { to: '/settings/departments', label: 'Departments', icon: Building2, roles: ['superadmin'] },
      { to: '/settings/asset-categories', label: 'Equipment Categories', icon: Tags, roles: ['superadmin'] },
      { to: '/settings/users', label: 'User Management', icon: UserRoundCog, roles: ['superadmin'] },
      {
        to: '/settings/activity-log',
        label: 'Activity Log',
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

/**
 * The desktop icon rail disappears below `sm` entirely (`hidden sm:flex`) —
 * there was no mobile nav fallback of any kind (GlobalSearch only searches
 * records, not pages), so a phone-width user had no way to move between
 * sections at all. A bottom tab bar, not a hamburger drawer, per explicit
 * request ("seperti app native mobile pada umumnya") — these 3 plus
 * Dashboard are the sections the earlier Fase 1 audit already identified as
 * the most-used operational screens (same reasoning QueryErrorState's
 * rollout used); everything else lives behind "Lainnya".
 */
const MOBILE_PRIMARY_LABELS = ['Inventory & Assets', 'Workspace', 'Maintenance']

const navIconButtonClass = 'relative flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors'
/** The left accent bar reads like a control-panel indicator lamp next to whichever icon is "on". */
const navIconButtonActiveClass =
  "bg-sidebar-primary/10 text-sidebar-primary after:absolute after:top-1/2 after:left-0 after:h-5 after:w-[3px] after:-translate-y-1/2 after:rounded-r-full after:bg-warning after:content-['']"
const navIconButtonInactiveClass = 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const showGlobalSearch = location.pathname !== '/'
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const sheetOpenCount = useSheetStackStore((state) => state.openCount)
  const userRoles = useAuthStore((state) => state.user?.roles ?? [])
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [headerExtraSlot, setHeaderExtraSlot] = useState<HTMLDivElement | null>(null)

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    document.title = companySetting?.app_name ?? 'Spare Parts Management System'
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

  const mobilePrimarySections = useMemo(
    () =>
      visibleNavSections.filter(
        (section) => section.items[0]?.to === '/' || MOBILE_PRIMARY_LABELS.includes(section.label ?? ''),
      ),
    [visibleNavSections],
  )
  const mobileOtherSections = useMemo(
    () => visibleNavSections.filter((section) => !mobilePrimarySections.includes(section)),
    [visibleNavSections, mobilePrimarySections],
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
   * Longest-prefix-wins within a group: without this, "Transaksi Stok"
   * (/stock/ledger) also lit up "Stok & Part" (/stock) since the latter is
   * a plain prefix of the former's path — both used to show active at once.
   */
  function isItemActive(item: NavItem, siblings: NavItem[]) {
    if (!pathMatches(item)) return false
    return !siblings.some((other) => other !== item && pathMatches(other) && other.to.length > item.to.length)
  }

  function isSectionActive(section: NavSection) {
    return section.items.some((item) => isItemActive(item, section.items))
  }

  return (
    <HeaderExtraSlotProvider value={headerExtraSlot}>
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
              title={companySetting?.app_name ?? 'Spare Parts Management System'}
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
            const isGroupActive = isSectionActive(section)

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
                <PopoverContent side="right" align="start" sideOffset={12} className="w-64">
                  <div className="mb-1 border-b border-warning/30 px-2 pb-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {section.label}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item, index) => (
                      <Fragment key={item.to}>
                        {item.subgroup !== section.items[index - 1]?.subgroup && item.subgroup && (
                          <p
                            className={cn(
                              'px-2 pt-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase',
                              index > 0 && 'mt-1 border-t pt-2',
                            )}
                          >
                            {item.subgroup}
                          </p>
                        )}
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
                      </Fragment>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-b-2 border-warning/40 bg-background/95 px-3 py-2 backdrop-blur supports-backdrop-filter:bg-background/60 sm:flex sm:items-center sm:gap-4 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:flex-1">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <BranchSelector />
            <div ref={setHeaderExtraSlot} className="flex items-center gap-2" />
          </div>
          {showGlobalSearch && (
            <div className="hidden w-full justify-center sm:flex sm:flex-1">
              <GlobalSearch />
            </div>
          )}
          <div className="flex items-center justify-end gap-1 sm:flex-1 sm:gap-2">
            {showGlobalSearch && (
              <div className="sm:hidden">
                <GlobalSearch />
              </div>
            )}
            <ThemeToggle />
            <NotificationsPopover />
            <ProfileMenu
              name={user?.name}
              email={user?.email}
              avatarUrl={user?.avatar_url}
              onEditProfile={() => setProfileDialogOpen(true)}
              onLogout={() => mutation.mutate()}
              isLoggingOut={mutation.isPending}
            />
            <ProfileFormDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
          </div>
        </header>
        <main
          className={cn(
            'scroll-thin flex-1 overflow-y-auto p-6 pb-24 transition-[margin-right] duration-300 sm:pb-6',
            sheetOpenCount > 0 && 'mr-96',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar — the mobile nav fallback the sidebar has none of
          below `sm`. A fixed bar of a few primary destinations plus
          "Lainnya" for everything else, not a hamburger drawer, per
          explicit request to match a native mobile app's own convention. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground sm:hidden">
        {mobilePrimarySections.map((section) => {
          const item = section.items[0]
          const Icon = section.icon ?? item.icon
          const label = section.label ?? item.label
          const active = isSectionActive(section)
          if (section.label === 'Inventory & Assets') {
            return (
              <Popover key={section.label}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                        active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
                      )}
                    />
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </PopoverTrigger>
                <PopoverContent side="top" align="start" sideOffset={12} className="w-64">
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((navItem, index) => (
                      <Fragment key={navItem.to}>
                        {navItem.subgroup !== section.items[index - 1]?.subgroup && navItem.subgroup && (
                          <p
                            className={cn(
                              'px-2 pt-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase',
                              index > 0 && 'mt-1 border-t pt-2',
                            )}
                          >
                            {navItem.subgroup}
                          </p>
                        )}
                        <NavLink
                          key={navItem.to}
                          to={navItem.to}
                          end={navItem.end}
                          onClick={() => setMobileMoreOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                            isItemActive(navItem, section.items)
                              ? 'bg-sidebar-primary/10 text-sidebar-primary'
                              : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                          )}
                        >
                          <navItem.icon className="size-4 shrink-0" />
                          {navItem.label}
                        </NavLink>
                      </Fragment>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )
          }
          return (
            <NavLink
              key={section.label ?? item.to}
              to={item.to}
              end={item.end}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
              )}
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          )
        })}
        <Popover open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                  mobileOtherSections.some(isSectionActive) ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
                )}
              />
            }
          >
            <MoreHorizontal className="size-5" />
            More
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={12} className="max-h-[70svh] w-64 overflow-y-auto">
            <div className="flex flex-col gap-2.5">
              {mobileOtherSections.map((section) => (
                <div key={section.label ?? section.items[0].to} className="flex flex-col gap-0.5">
                  {section.label && section.items.length > 1 && (
                    <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {section.label}
                    </p>
                  )}
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMoreOpen(false)}
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
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </div>
    </HeaderExtraSlotProvider>
  )
}
