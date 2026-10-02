import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  CalendarCheck,
  CalendarClock,
  Coins,
  FileWarning,
  Layers,
  Network,
  Package,
  PackageSearch,
  Scale,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { fetchDashboardAnalytics } from '@/features/dashboard/api'
import { BudgetProjectionChart } from '@/features/dashboard/BudgetProjectionChart'
import { HierarchicalSunburst } from '@/features/dashboard/HierarchicalSunburst'
import { InventoryHealthBar } from '@/features/dashboard/InventoryHealthBar'
import { LifeBasedList } from '@/features/dashboard/LifeBasedList'
import { MaintenancePerformanceChart } from '@/features/dashboard/MaintenancePerformanceChart'
import { MonthlyCostTrendChart } from '@/features/dashboard/MonthlyCostTrendChart'
import { Nameplate } from '@/components/Nameplate'
import { PanelCard } from '@/components/PanelCard'
import { PmVsFailureCostChart } from '@/features/dashboard/PmVsFailureCostChart'
import { RadialMapChart } from '@/features/dashboard/RadialMapChart'
import { RankedBarList } from '@/features/dashboard/RankedBarList'
import { ScheduledVsFailureTrendChart } from '@/features/dashboard/ScheduledVsFailureTrendChart'
import { StockMovementTrendChart } from '@/features/dashboard/StockMovementTrendChart'
import { fetchFp3RequestsForBranch } from '@/features/fp3/api'
import { fetchParts } from '@/features/parts/api'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import { useHasRole } from '@/stores/use-has-role'
import { QueryErrorState } from '@/components/QueryErrorState'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function compactRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`
  if (value >= 1_000) return `Rp ${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}rb`
  return `Rp ${value.toLocaleString('id-ID')}`
}

export function DashboardPage() {
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

  // Client-computed from the already-fetched pmTasks — operational, not
  // financial, so this stays visible to every role (unlike everything else
  // new on this page, which reuses the existing canViewCost gate).
  const today = new Date()
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const dueWithin = (days: Date) =>
    openPmTasks.filter((t) => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= days).length
  const pmDueIn7Days = dueWithin(in7Days)
  const pmDueIn30Days = dueWithin(in30Days)

  const openRequests = fp3Requests?.filter((r) => r.status === 'pending' || r.status === 'in_progress') ?? []
  const overdueRequestCount = openRequests.filter((r) => r.is_overdue).length

  return (
    <div className="flex flex-col gap-4">
      {!activeBranchId ? (
        <p className="text-sm text-muted-foreground">
          Pilih plant di header untuk melihat ringkasan stok & breakdown plant tersebut.
        </p>
      ) : hasError ? (
        <QueryErrorState onRetry={retryAll} title="Gagal memuat data Dashboard" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {canViewCost && (
              <Nameplate
                label="Nilai Total Stok"
                value={compactRupiah(Number(analytics?.stock_value ?? 0))}
                sub="Total nilai stok di plant ini"
                icon={Wallet}
                href="/stock"
                loading={analyticsLoading}
              />
            )}
            <Nameplate
              label="Total Part"
              value={parts?.length ?? 0}
              sub="Terdaftar di katalog"
              icon={Package}
              href="/stock"
              loading={partsLoading}
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
              label="PM Jatuh Tempo (7 Hari)"
              value={pmDueIn7Days}
              sub={`${pmDueIn30Days} dalam 30 hari`}
              icon={CalendarCheck}
              href="/pm/calendar?tab=list"
              tone={pmDueIn7Days > 0 ? 'warning' : 'default'}
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
            {canViewCost && (
              <Nameplate
                label="Equipment Tanpa PM"
                value={analytics?.equipment_coverage.without_library ?? 0}
                sub={`dari ${analytics?.equipment_coverage.total_equipment ?? 0} equipment belum ada Task Library`}
                icon={ShieldAlert}
                href="/task-libraries"
                tone={(analytics?.equipment_coverage.without_library ?? 0) > 0 ? 'warning' : 'default'}
                loading={analyticsLoading}
              />
            )}
          </div>

          {/* Inventory Health + Maintenance Performance right under the nameplate row — same Nameplate shell/height/font as the stat tiles above, just a bar instead of a single number. */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {stocksLoading ? (
              <Skeleton className="h-[52px] w-full" />
            ) : (
              <InventoryHealthBar critical={criticalCount} warning={warningCount} normal={normalCount} />
            )}

            {canViewCost &&
              (analyticsLoading ? (
                <Skeleton className="h-[52px] w-full" />
              ) : (
                <MaintenancePerformanceChart
                  on_time_count={analytics?.maintenance_performance.on_time_count ?? 0}
                  late_count={analytics?.maintenance_performance.late_count ?? 0}
                />
              ))}
          </div>

          {canViewCost && (
            <>
              {/* Sunburst mapping + tren, dipindah dari section grid di bawah supaya langsung terlihat di atas, tepat di bawah Inventory Health/Maintenance Performance. */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                <PanelCard size="sm" className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers className="size-4" />
                      Mapping Part
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-52 w-full" />
                    ) : (
                      <HierarchicalSunburst
                        data={(analytics?.installation_sunburst ?? []).map((row) => ({ ...row, value: row.count }))}
                        centerLabel="Terpasang"
                        emptyMessage="Belum ada part terpasang di plant ini."
                        formatValue={(v) => `${v}`}
                        ariaLabel="Sunburst instalasi part per Line, Mesin, Equipment, dan Part"
                      />
                    )}
                  </CardContent>
                </PanelCard>

                <PanelCard size="sm" className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowLeftRight className="size-4" />
                      Tren Keluar-Masuk Stok
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? <Skeleton className="h-64 w-full" /> : <StockMovementTrendChart data={analytics?.stock_movement_trend ?? []} />}
                  </CardContent>
                </PanelCard>

                <PanelCard size="sm" className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Tren Scheduled vs Failure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <ScheduledVsFailureTrendChart data={analytics?.scheduled_vs_failure_trend ?? []} />
                    )}
                  </CardContent>
                </PanelCard>

                <PanelCard size="sm" className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Network className="size-4" />
                      Cost per Line & Equipment ({new Date().getFullYear()})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-52 w-full" />
                    ) : (
                      <HierarchicalSunburst
                        data={(analytics?.cost_sunburst ?? []).map((row) => ({ ...row, value: Number(row.cost) }))}
                        centerLabel="Biaya"
                        emptyMessage="Belum ada biaya tercatat tahun ini."
                        formatValue={(v) => compactRupiah(v)}
                        ariaLabel="Sunburst biaya per Line, Mesin, Equipment, dan Part"
                      />
                    )}
                  </CardContent>
                </PanelCard>
              </div>

              <PanelCard size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4" />
                    Life Based Part Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? <Skeleton className="h-56 w-full" /> : <LifeBasedList parts={analytics?.at_risk_parts ?? []} />}
                </CardContent>
              </PanelCard>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <PanelCard size="sm" className="lg:col-span-1">
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
                </PanelCard>

                <PanelCard size="sm" className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Tren Biaya Bulanan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? <Skeleton className="h-32 w-full" /> : <MonthlyCostTrendChart data={analytics?.failure_trend ?? []} />}
                  </CardContent>
                </PanelCard>

                <PanelCard size="sm" className="lg:col-span-1">
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
                </PanelCard>
              </div>

              <PanelCard size="sm">
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
              </PanelCard>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <PanelCard size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scale className="size-4" />
                      Sebaran Cost PM vs Failure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <PmVsFailureCostChart
                        pm_cost={analytics?.pm_vs_failure_cost.pm_cost ?? '0.00'}
                        failure_cost={analytics?.pm_vs_failure_cost.failure_cost ?? '0.00'}
                      />
                    )}
                  </CardContent>
                </PanelCard>

                <PanelCard size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Coins className="size-4" />
                      Part Cost Tertinggi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <RankedBarList
                        items={(analytics?.cost_by_part ?? []).map((row) => ({
                          label: row.part_name,
                          sublabel: row.item_master_no,
                          value: Number(row.cost),
                        }))}
                        formatValue={(v) => compactRupiah(v)}
                        emptyMessage="Belum ada biaya part tercatat dalam 12 bulan terakhir."
                      />
                    )}
                  </CardContent>
                </PanelCard>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <PanelCard size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="size-4" />
                      Beban Kerja per Teknisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <RankedBarList
                        items={(analytics?.technician_workload ?? []).map((row) => ({ label: row.name, value: row.open_count }))}
                        emptyMessage="Tidak ada WO yang sedang diklaim siapa pun."
                        barColorClass="bg-primary"
                      />
                    )}
                  </CardContent>
                </PanelCard>

                <PanelCard size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PackageSearch className="size-4" />
                      Fast vs Slow Moving Parts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {analyticsLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Paling Sering Keluar</p>
                          <RankedBarList
                            items={(analytics?.part_movement.fast_moving ?? []).map((row) => ({
                              label: row.part_name,
                              sublabel: row.item_master_no,
                              value: row.qty_issued ?? 0,
                            }))}
                            emptyMessage="Belum ada part keluar dalam 12 bulan terakhir."
                            barColorClass="bg-success"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 border-t pt-3">
                          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Jarang Bergerak</p>
                          <RankedBarList
                            items={(analytics?.part_movement.slow_moving ?? []).map((row) => ({
                              label: row.part_name,
                              sublabel: row.item_master_no,
                              value: row.quantity_on_hand ?? 0,
                            }))}
                            emptyMessage="Tidak ada part yang menumpuk tanpa pergerakan."
                            barColorClass="bg-warning"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </PanelCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
