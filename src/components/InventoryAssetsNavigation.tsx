import { ArrowLeftRight, Boxes, Building2, Factory, MapPin, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useIsSuperadmin } from '@/stores/use-has-role'

const stockPages = [
  { to: '/stock', label: 'Parts Inventory', icon: Boxes, end: true },
  { to: '/stock/ledger', label: 'Stock Transactions', icon: ArrowLeftRight },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, end: true },
  { to: '/locations', label: 'Locations', icon: MapPin, end: true },
]

const assetPages = [
  { to: '/branches', label: 'Plants', icon: Building2, end: true },
  { to: '/lines', label: 'Production Lines', icon: Factory, end: true },
]

export function ActionTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function InventoryAssetsNavigation() {
  const isSuperadmin = useIsSuperadmin()
  const location = useLocation()
  const navigate = useNavigate()
  const inAssets = location.pathname === '/branches' || location.pathname.startsWith('/lines')
  const section = inAssets && isSuperadmin ? 'assets' : 'stock'
  const pages = section === 'assets' ? assetPages : stockPages

  return (
    <nav aria-label="Inventory and assets navigation" className="hidden min-w-0 items-center gap-1 sm:flex">
      <div className="flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto">
        {pages.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-3" />
            {label}
          </NavLink>
        ))}
      </div>
      {isSuperadmin && (
        <>
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant={section === 'stock' ? 'default' : 'ghost'}
                    size="icon-xs"
                    aria-label="Stock Management"
                    onClick={() => navigate(stockPages[0].to)}
                  />
                }
              >
                <Boxes className="size-3" />
              </TooltipTrigger>
              <TooltipContent>Stock Management</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant={section === 'assets' ? 'default' : 'ghost'}
                    size="icon-xs"
                    aria-label="Assets and Production"
                    onClick={() => navigate(assetPages[0].to)}
                  />
                }
              >
                <Factory className="size-3" />
              </TooltipTrigger>
              <TooltipContent>Assets &amp; Production</TooltipContent>
            </Tooltip>
          </div>
        </>
      )}
    </nav>
  )
}
