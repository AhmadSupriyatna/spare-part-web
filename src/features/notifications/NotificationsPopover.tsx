import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, ClipboardCheck, Package, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { fetchReplacementRequests } from '@/features/breakdown/api'
import { fetchPartUnitActionRequests } from '@/features/part-unit-actions/api'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanApprove } from '@/stores/use-has-role'
import type { ReplacementRequest } from '@/types/breakdown'
import type { PartStock } from '@/types/inventory'
import type { PartUnitActionRequest } from '@/types/part-unit-actions'
import type { Task } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const UPCOMING_DAYS = 7
const MAX_ITEMS_PER_GROUP = 5

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function taskIsDueSoon(task: Task, today: string, upcomingLimit: string): boolean {
  return (
    (task.status === 'pending' || task.status === 'in_progress') &&
    task.due_date !== null &&
    task.due_date <= upcomingLimit &&
    task.due_date >= today
  )
}

function taskIsOverdue(task: Task, today: string): boolean {
  return (
    (task.status === 'pending' || task.status === 'in_progress') &&
    task.due_date !== null &&
    task.due_date < today
  )
}

function stockIsLow(stock: PartStock): boolean {
  return stock.is_critical || stock.is_warning
}

function taskLabel(task: Task): string {
  return [task.title, task.equipment_name, task.due_date].filter(Boolean).join(' · ')
}

function breakdownLabel(request: ReplacementRequest): string {
  return [`Permintaan ${request.event_type}`, request.part_name, request.equipment_name]
    .filter(Boolean)
    .join(' · ')
}

function actionRequestLabel(request: PartUnitActionRequest): string {
  return [
    request.action === 'reinstall' ? 'Permintaan pasang kembali' : 'Permintaan lepas part',
    request.part_name ?? request.unit_code,
    request.equipment_name,
  ]
    .filter(Boolean)
    .join(' · ')
}

function NotificationLink({
  to,
  icon: Icon,
  children,
  onClick,
  urgent = false,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onClick: () => void
  urgent?: boolean
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${urgent ? 'text-destructive' : 'text-muted-foreground'}`} />
      <span className="min-w-0">{children}</span>
    </Link>
  )
}

export function NotificationsPopover() {
  const branchId = useBranchStore((state) => state.activeBranchId)
  const canApprove = useCanApprove()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const tasksQuery = useQuery({
    queryKey: ['notifications', 'tasks', branchId],
    queryFn: () => fetchPmTasksForBranch(branchId!),
    enabled: branchId !== null,
    refetchInterval: 5 * 60 * 1000,
  })

  const stockQuery = useQuery({
    queryKey: ['notifications', 'stock', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId!),
    enabled: branchId !== null,
    refetchInterval: 5 * 60 * 1000,
  })

  const replacementQuery = useQuery({
    queryKey: ['notifications', 'replacement-requests', branchId],
    queryFn: () => fetchReplacementRequests(branchId!, 'pending'),
    enabled: branchId !== null && canApprove,
    refetchInterval: 60 * 1000,
  })

  const partUnitQuery = useQuery({
    queryKey: ['notifications', 'part-unit-requests', branchId],
    queryFn: () => fetchPartUnitActionRequests(branchId!, 'pending'),
    enabled: branchId !== null && canApprove,
    refetchInterval: 60 * 1000,
  })

  const today = dateOnly(new Date())
  const upcomingLimitDate = new Date()
  upcomingLimitDate.setDate(upcomingLimitDate.getDate() + UPCOMING_DAYS)
  const upcomingLimit = dateOnly(upcomingLimitDate)

  const overdueTasks = (tasksQuery.data ?? []).filter((task) => taskIsOverdue(task, today))
  const dueSoonTasks = (tasksQuery.data ?? []).filter((task) => taskIsDueSoon(task, today, upcomingLimit))
  const lowStocks = (stockQuery.data ?? []).filter(stockIsLow)
  const replacementRequests = replacementQuery.data ?? []
  const partUnitRequests = partUnitQuery.data ?? []

  const totalCount =
    overdueTasks.length +
    dueSoonTasks.length +
    lowStocks.length +
    replacementRequests.length +
    partUnitRequests.length
  const isLoading =
    tasksQuery.isLoading ||
    stockQuery.isLoading ||
    (canApprove && (replacementQuery.isLoading || partUnitQuery.isLoading))

  const hasError =
    tasksQuery.isError ||
    stockQuery.isError ||
    (canApprove && (replacementQuery.isError || partUnitQuery.isError))

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon-sm" className="relative" aria-label="Notifikasi" title="Notifikasi">
            <Bell />
            {totalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {totalCount > 9 ? '9+' : totalCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Notifikasi</h2>
          <Button variant="ghost" size="xs" onClick={refresh}>
            Segarkan
          </Button>
        </div>
        <div className="scroll-thin max-h-[min(70vh,32rem)] overflow-y-auto p-2">
          {!branchId ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">Pilih plant untuk melihat notifikasi.</p>
          ) : (
            <>
              {hasError && (
                <p className="px-2 py-2 text-sm text-destructive">
                  Sebagian notifikasi gagal dimuat. Coba segarkan kembali.
                </p>
              )}
              {isLoading ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">Memuat notifikasi...</p>
              ) : null}

              {overdueTasks.length > 0 && (
                <section className="mb-2">
                  <h3 className="px-2 py-1 text-xs font-semibold uppercase text-destructive">Work Order terlambat</h3>
                  {overdueTasks.slice(0, MAX_ITEMS_PER_GROUP).map((task) => (
                    <NotificationLink
                      key={`overdue-${task.id}`}
                      to="/pm/calendar?tab=list"
                      icon={AlertTriangle}
                      urgent
                      onClick={() => setOpen(false)}
                    >
                      {taskLabel(task)}
                    </NotificationLink>
                  ))}
                  {overdueTasks.length > MAX_ITEMS_PER_GROUP && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      dan {overdueTasks.length - MAX_ITEMS_PER_GROUP} Work Order lainnya
                    </p>
                  )}
                </section>
              )}

              {dueSoonTasks.length > 0 && (
                <section className="mb-2">
                  <h3 className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Work Order 7 hari ke depan
                  </h3>
                  {dueSoonTasks.slice(0, MAX_ITEMS_PER_GROUP).map((task) => (
                    <NotificationLink
                      key={`due-${task.id}`}
                      to="/pm/calendar?tab=list"
                      icon={Wrench}
                      onClick={() => setOpen(false)}
                    >
                      {taskLabel(task)}
                    </NotificationLink>
                  ))}
                </section>
              )}

              {lowStocks.length > 0 && (
                <section className="mb-2">
                  <h3 className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Stok part menipis</h3>
                  {lowStocks.slice(0, MAX_ITEMS_PER_GROUP).map((stock) => (
                    <NotificationLink
                      key={`stock-${stock.id}`}
                      to="/stock"
                      icon={Package}
                      urgent={stock.is_critical}
                      onClick={() => setOpen(false)}
                    >
                      {stock.part_name ?? stock.item_master_no ?? `Part #${stock.part_id}`} — tersedia{' '}
                      {stock.available_quantity}
                    </NotificationLink>
                  ))}
                  {lowStocks.length > MAX_ITEMS_PER_GROUP && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      dan {lowStocks.length - MAX_ITEMS_PER_GROUP} stok lainnya
                    </p>
                  )}
                </section>
              )}

              {replacementRequests.length + partUnitRequests.length > 0 && (
                <section className="mb-2">
                  <h3 className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Permintaan menunggu persetujuan
                  </h3>
                  {replacementRequests.slice(0, MAX_ITEMS_PER_GROUP).map((request) => (
                    <NotificationLink
                      key={`replacement-${request.id}`}
                      to="/approval"
                      icon={ClipboardCheck}
                      onClick={() => setOpen(false)}
                    >
                      {breakdownLabel(request)}
                    </NotificationLink>
                  ))}
                  {partUnitRequests.slice(0, MAX_ITEMS_PER_GROUP).map((request) => (
                    <NotificationLink
                      key={`part-unit-${request.id}`}
                      to="/approval"
                      icon={ClipboardCheck}
                      onClick={() => setOpen(false)}
                    >
                      {actionRequestLabel(request)}
                    </NotificationLink>
                  ))}
                </section>
              )}

              {!hasError && !isLoading && totalCount === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
