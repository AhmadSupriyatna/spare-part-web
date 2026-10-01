import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, FileWarning, Layers, Package, Sparkles, Target, Wallet } from 'lucide-react'
import { fetchDashboardAnalytics } from '@/features/dashboard/api'
import { BudgetProjectionChart } from '@/features/dashboard/BudgetProjectionChart'
import { InventoryHealthGauge } from '@/features/dashboard/InventoryHealthGauge'
import { LifeBasedRadialChart } from '@/features/dashboard/LifeBasedRadialChart'
import { MaintenancePerformanceChart } from '@/features/dashboard/MaintenancePerformanceChart'
import { Nameplate } from '@/features/dashboard/Nameplate'
import { RadialMapChart } from '@/features/dashboard/RadialMapChart'
import { ReplacementCostTrendChart } from '@/features/dashboard/ReplacementCostTrendChart'
import { fetchFp3RequestsForBranch } from '@/features/fp3/api'
import { fetchParts } from '@/features/parts/api'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import { useHasRole } from '@/stores/use-has-role'
import { PageHeader } from '@/components/PageHeader'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canViewCost = useHasRole(['admin_spare_part', 'supervisor', 'superadmin'])

  const {
    data: parts,
    isLoading: partsLoading,
    isError: partsError,
    refetch: refetchParts,
  } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const {
    data: stocks,
    isLoading: stocksLoading,
    isError: stocksError,
    refetch: refetchStocks,
  } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const {
    data: pmTasks,
    isLoading: pmTasksLoading,
    isError: pmTasksError,
    refetch: refetchPmTasks,
  } = useQuery({
    queryKey: ['pm-tasks', activeBranchId],
    queryFn: () => fetchPmTasksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const {
    data: fp3Requests,
    isLoading: fp3Loading,
    isError: fp3Error,
    refetch: refetchFp3,
  } = useQuery({
    queryKey: ['fp3-requests', activeBranchId, 'dashboard'],
    queryFn: () => fetchFp3RequestsForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['dashboard-analytics', activeBranchId],
    queryFn: () => fetchDashboardAnalytics(activeBranchId!),
    enabled: !!activeBranchId && canViewCost,
  })

  const hasError = partsError || stocksError || pmTasksError || fp3Error || (canViewCost && analyticsError)

  function retryAll() {
    refetchParts()
    refetchStocks()
    refetchPmTasks()
    refetchFp3()
    if (canViewCost) refetchAnalytics()
  }

  const criticalStocks = stocks?.filter((s) => s.is_critical) ?? []
  const criticalCount = criticalStocks.length
  const warningCount = stocks?.filter((s) => s.is_warning).length ?? 0
  const normalCount = Math.max(0, (stocks?.length ?? 0) - criticalCount - warningCount)

  const openPmTasks = pmTasks?.filter((t) => t.status === 'pending' || t.status === 'in_progress') ?? []
  const overduePmCount = openPmTasks.filter((t) => t.is_overdue).length

  const openRequests = fp3Requests?.filter((r) => r.status === 'pending' || r.status === 'in_progress') ?? []
  const overdueRequestCount = openRequests.filter((r) => r.is_overdue).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Halo, ${user?.name?.split(' ')[0] ?? 'kamu'}`} />

      {!activeBranchId ? (
        <p className="text-sm text-muted-foreground">
          Pilih plant di header untuk melihat ringkasan stok & breakdown plant tersebut.
        </p>
      ) : hasError ? (
        <QueryErrorState onRetry={retryAll} title="Gagal memuat data Dashboard" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <Nameplate
              label="Total Part"
              value={parts?.length ?? 0}
              sub="Terdaftar di katalog"
              icon={Package}
              href="/stock"
              loading={partsLoading}
            />
            <Nameplate
              label="Part Kritis"
              value={criticalCount}
              sub="Stok di bawah cadangan"
              icon={AlertTriangle}
              href="/stock"
              tone={criticalCount > 0 ? 'destructive' : 'default'}
              loading={stocksLoading}
            />
            <Nameplate
              label="Part Warning"
              value={warningCount}
              sub="Perlu dipantau"
              icon={AlertTriangle}
              href="/stock"
              tone={warningCount > 0 ? 'warning' : 'default'}
              loading={stocksLoading}
            />
            <Nameplate
              label="PM Schedule Open"
              value={openPmTasks.length}
              sub={overduePmCount > 0 ? `${overduePmCount} terlambat` : 'Menunggu dikerjakan'}
              icon={CalendarClock}
              href="/pm/calendar?tab=list"
              tone={overduePmCount > 0 ? 'destructive' : openPmTasks.length > 0 ? 'warning' : 'default'}
              loading={pmTasksLoading}
            />
            <Nameplate
              label="Request Open"
              value={openRequests.length}
              sub={overdueRequestCount > 0 ? `${overdueRequestCount} terlambat` : 'FP3 belum selesai'}
              icon={FileWarning}
              href="/fp3"
              tone={overdueRequestCount > 0 ? 'destructive' : openRequests.length > 0 ? 'warning' : 'default'}
              loading={fp3Loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Inventory Health</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {stocksLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <>
                    <InventoryHealthGauge critical={criticalCount} warning={warningCount} normal={normalCount} />
                    {criticalCount > 0 && (
                      <div className="flex flex-col gap-1 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground">Part Kritis</p>
                        {criticalStocks.slice(0, 4).map((s) => (
                          <p key={s.id} className="truncate text-xs">
                            {s.part_name}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {canViewCost && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="size-4" />
                      Life Based Part Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? <Skeleton className="h-56 w-full" /> : <LifeBasedRadialChart parts={analytics?.at_risk_parts ?? []} />}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="size-4" />
                      Maintenance Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <MaintenancePerformanceChart
                        on_time_count={analytics?.maintenance_performance.on_time_count ?? 0}
                        late_count={analytics?.maintenance_performance.late_count ?? 0}
                      />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {canViewCost && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers className="size-4" />
                      Mapping Instalasi Part
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-52 w-full" />
                    ) : (
                      <RadialMapChart
                        data={analytics?.installation_map ?? []}
                        centerLabel="Terpasang"
                        emptyMessage="Belum ada part terpasang di plant ini."
                        ariaLabel="Peta radial instalasi part per Line dan Mesin"
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Tren Replacement & Failure (12 Bulan Terakhir)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? <Skeleton className="h-32 w-full" /> : <ReplacementCostTrendChart data={analytics?.failure_trend ?? []} />}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Radial Map Failure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-52 w-full" />
                    ) : (
                      <RadialMapChart
                        data={analytics?.failure_radial ?? []}
                        centerLabel="Kejadian"
                        emptyMessage="Belum ada failure/breakdown tercatat dalam 12 bulan terakhir."
                        ariaLabel="Peta radial failure per Line dan Mesin"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

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
            </>
          )}
        </>
      )}
    </div>
  )
}
