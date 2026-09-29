import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  History,
  type LucideIcon,
  Package,
  PackageSearch,
  ShieldCheck,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router'
import { fetchActivityLog } from '@/features/activity-log/api'
import { fetchReorderRequests } from '@/features/alerts/api'
import { fetchReplacementRequests } from '@/features/breakdown/api'
import { BudgetProjectionChart } from '@/features/dashboard/BudgetProjectionChart'
import { fetchDashboardAnalytics } from '@/features/dashboard/api'
import { CostHeatmap } from '@/features/dashboard/CostHeatmap'
import { FailureTrendChart } from '@/features/dashboard/FailureTrendChart'
import { PmScheduleChart } from '@/features/dashboard/PmScheduleChart'
import { StockHealthDonut } from '@/features/dashboard/StockHealthDonut'
import { fetchParts } from '@/features/parts/api'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { fetchPmTasksForBranch, fetchMyTasks } from '@/features/tasks/api'
import { fetchActiveUsers } from '@/features/users/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import { useCanApprove, useCanManage, useHasRole } from '@/stores/use-has-role'
import { PageHeader } from '@/components/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface SummaryCardProps {
  title: string
  value: number
  icon: LucideIcon
  href: string
  tone?: 'default' | 'warning' | 'destructive'
  loading?: boolean
}

const toneClasses: Record<NonNullable<SummaryCardProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
}

function SummaryCard({ title, value, icon: Icon, href, tone = 'default', loading }: SummaryCardProps) {
  return (
    <Link to={href}>
      <Card className="transition-colors hover:bg-muted/40">
        <CardContent className="flex items-center gap-4">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canApprove = useCanApprove()
  const canManage = useCanManage()
  const canWork = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const canViewLog = useHasRole(['admin_spare_part', 'supervisor', 'superadmin'])
  const canViewCost = useHasRole(['admin_spare_part', 'supervisor', 'superadmin'])

  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const { data: stocks, isLoading: stocksLoading } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: pmTasks, isLoading: pmTasksLoading } = useQuery({
    queryKey: ['pm-tasks', activeBranchId],
    queryFn: () => fetchPmTasksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'mine', activeBranchId],
    queryFn: () => fetchMyTasks(activeBranchId),
    enabled: !!activeBranchId && canWork,
  })

  const { data: pendingReplacements, isLoading: replacementsLoading } = useQuery({
    queryKey: ['replacement-requests', activeBranchId, 'pending'],
    queryFn: () => fetchReplacementRequests(activeBranchId!, 'pending'),
    enabled: !!activeBranchId && canApprove,
  })

  const { data: pendingReorders, isLoading: reorderLoading } = useQuery({
    queryKey: ['reorder-requests', activeBranchId, 'pending'],
    queryFn: () => fetchReorderRequests(activeBranchId!, 'pending'),
    enabled: !!activeBranchId && canManage,
  })

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics', activeBranchId],
    queryFn: () => fetchDashboardAnalytics(activeBranchId!),
    enabled: !!activeBranchId && canViewCost,
  })

  const { data: activeUsers, isLoading: activeUsersLoading } = useQuery({
    queryKey: ['active-users', activeBranchId],
    queryFn: () => fetchActiveUsers(activeBranchId!),
    enabled: !!activeBranchId,
    refetchInterval: 60_000,
  })

  const { data: recentActivity, isLoading: recentActivityLoading } = useQuery({
    queryKey: ['activity-log', activeBranchId, 'recent'],
    queryFn: () => fetchActivityLog(activeBranchId!, {}),
    enabled: !!activeBranchId && canViewLog,
  })

  const activeTaskCount =
    tasks?.filter((task) => task.status === 'pending' || task.status === 'in_progress').length ?? 0

  const criticalCount = stocks?.filter((s) => s.is_critical).length ?? 0
  const warningCount = stocks?.filter((s) => s.is_warning).length ?? 0
  const normalCount = Math.max(0, (stocks?.length ?? 0) - criticalCount - warningCount)

  const overduePmCount =
    pmTasks?.filter((t) => t.is_overdue && (t.status === 'pending' || t.status === 'in_progress')).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Halo, ${user?.name?.split(' ')[0] ?? 'kamu'}`}
        description={
          <>
            Peran: {user?.roles.join(', ') || '-'} &middot; Plant:{' '}
            {user?.branches.map((branch) => branch.name).join(', ') || '-'}
          </>
        }
      />

      {!activeBranchId ? (
        <p className="text-sm text-muted-foreground">
          Pilih plant di header untuk melihat ringkasan stok & breakdown plant tersebut.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Total Part"
              value={parts?.length ?? 0}
              icon={Package}
              href="/stock"
              loading={partsLoading}
            />
            <SummaryCard
              title="Part Kritis"
              value={criticalCount}
              icon={AlertTriangle}
              href="/stock"
              tone={criticalCount > 0 ? 'destructive' : 'default'}
              loading={stocksLoading}
            />
            <SummaryCard
              title="Part Peringatan"
              value={warningCount}
              icon={AlertTriangle}
              href="/stock"
              tone={warningCount > 0 ? 'warning' : 'default'}
              loading={stocksLoading}
            />
            <SummaryCard
              title="PM Terlambat"
              value={overduePmCount}
              icon={CalendarClock}
              href="/pm/calendar?tab=list"
              tone={overduePmCount > 0 ? 'destructive' : 'default'}
              loading={pmTasksLoading}
            />
            {canWork && (
              <SummaryCard
                title="WO Bisa Dikerjakan"
                value={activeTaskCount}
                icon={ClipboardList}
                href="/workspace"
                loading={tasksLoading}
              />
            )}
            {canApprove && (
              <SummaryCard
                title="Breakdown Menunggu"
                value={pendingReplacements?.length ?? 0}
                icon={ShieldCheck}
                href="/approval"
                tone={pendingReplacements && pendingReplacements.length > 0 ? 'warning' : 'default'}
                loading={replacementsLoading}
              />
            )}
            {canManage && (
              <SummaryCard
                title="Reorder Menunggu"
                value={pendingReorders?.length ?? 0}
                icon={PackageSearch}
                href="/alerts"
                tone={pendingReorders && pendingReorders.length > 0 ? 'warning' : 'default'}
                loading={reorderLoading}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kesehatan Stok</CardTitle>
              </CardHeader>
              <CardContent>
                {stocksLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <StockHealthDonut critical={criticalCount} warning={warningCount} normal={normalCount} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jadwal PM (Terlambat & 6 Minggu ke Depan)</CardTitle>
              </CardHeader>
              <CardContent>
                {pmTasksLoading ? <Skeleton className="h-28 w-full" /> : <PmScheduleChart tasks={pmTasks ?? []} />}
              </CardContent>
            </Card>
          </div>

          {canViewCost && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingDown className="size-4" />
                      Tren Failure / Breakdown (12 Bulan Terakhir)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-28 w-full" />
                    ) : (
                      <FailureTrendChart data={analytics?.failure_trend ?? []} />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wallet className="size-4" />
                      Proyeksi Biaya vs Realisasi ({analytics?.budget_projection.year ?? new Date().getFullYear()})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <BudgetProjectionChart
                        rows={analytics?.budget_projection.rows ?? []}
                        plannedTotal={analytics?.budget_projection.planned_total ?? '0.00'}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Peta Biaya per Line & Mesin (12 Bulan Terakhir)</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? <Skeleton className="h-32 w-full" /> : <CostHeatmap data={analytics?.cost_heatmap ?? []} />}
                </CardContent>
              </Card>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-muted-foreground" />
                  User Aktif Sekarang
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {activeUsersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : !activeUsers || activeUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada user yang aktif dalam 5 menit terakhir.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarImage src={u.avatar_url ?? undefined} alt={u.name} />
                          <AvatarFallback>{initials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.roles.join(', ')}</p>
                        </div>
                        <span className="size-2 shrink-0 rounded-full bg-success" title="Aktif" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {canViewLog && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="size-4 text-muted-foreground" />
                    Aktivitas Terbaru
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {recentActivityLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : !recentActivity || recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {recentActivity.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.causer_name ?? 'Sistem'} &middot;{' '}
                              {new Date(entry.created_at).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {entry.subject_label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/settings/activity-log" className="text-xs text-primary hover:underline">
                    Lihat semua log aktivitas →
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
