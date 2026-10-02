import { AlertTriangle, Boxes, CalendarClock, Gauge, TrendingDown, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import type { CostByEquipment, MachineMonitoringData } from '@/features/machines/api'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { Nameplate } from '@/components/Nameplate'
import { PanelCard } from '@/components/PanelCard'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

/** Thin bars, one hue (destructive — a failure count, not routine usage), rounded top, count shown above each bar. Mirrors Part Detail's MonthlyUsageChart. */
export function MonthlyFailureChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada failure/breakdown tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tabular-nums text-foreground">{d.count > 0 ? d.count : ''}</span>
          <div className="flex h-16 w-full items-end" title={`${monthLabel(d.month)}: ${d.count} kejadian`}>
            <div
              className={cn('w-full rounded-t', d.count > 0 ? 'bg-destructive' : 'bg-muted')}
              style={{ height: `${d.count > 0 ? Math.max((d.count / max) * 100, 6) : 3}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  )
}

/** Same shape as MonthlyFailureChart but qty-based (primary hue) — cost, when present, only ever shows in the hover title, never as visible text, so this chart renders identically whether or not the caller has cost access. */
function MonthlyConsumptionChart({ data }: { data: { month: string; quantity: number; cost?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.quantity))
  const total = data.reduce((sum, d) => sum + d.quantity, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada pemakaian part tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tabular-nums text-foreground">{d.quantity > 0 ? d.quantity : ''}</span>
          <div
            className="flex h-16 w-full items-end"
            title={`${monthLabel(d.month)}: ${d.quantity} unit${d.cost ? ` · ${currencyFormatter.format(Number(d.cost))}` : ''}`}
          >
            <div
              className={cn('w-full rounded-t', d.quantity > 0 ? 'bg-primary' : 'bg-muted')}
              style={{ height: `${d.quantity > 0 ? Math.max((d.quantity / max) * 100, 6) : 3}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  )
}

function percentUsedClass(percent: number): string {
  if (percent >= 100) return 'bg-destructive'
  if (percent >= 80) return 'bg-warning'
  return 'bg-success'
}

function installDateLabel(installedAt: string): string {
  return new Date(installedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

interface MachineDashboardContentProps {
  data: MachineMonitoringData
  /** Gates the one cost-bearing tile (Nilai Part Terpasang) — the consumption chart/top-parts list render identically either way, just without a cost figure to show. */
  installedPartValue?: string
  /** Cost-gated like installedPartValue — when present, adds the "Konsumsi Biaya per Equipment" card. */
  costByEquipmentThisYear?: CostByEquipment[]
}

/**
 * Everything below a Machine's own header card — shared by the public
 * QR-scan "Monitoring Life Time Mesin" page and the authenticated Machine
 * Detail page, so the two stay visually identical except for the one cost
 * tile. Equipment grouping for "Part per Equipment" is done client-side
 * here from the flat `installations` list — it already carries
 * equipment_id/equipment_name per row, so no separate endpoint/shape was
 * needed just to group it by equipment instead of by part.
 */
export function MachineDashboardContent({ data, installedPartValue, costByEquipmentThisYear }: MachineDashboardContentProps) {
  const installationsByEquipment = new Map<number, { name: string; installations: typeof data.installations }>()
  for (const installation of data.installations) {
    const key = installation.equipment_id
    if (!installationsByEquipment.has(key)) {
      installationsByEquipment.set(key, { name: installation.equipment_name ?? `Equipment #${key}`, installations: [] })
    }
    installationsByEquipment.get(key)!.installations.push(installation)
  }

  const historicalLifetimeByPartId = new Map(data.historical_part_lifetime.map((row) => [row.part_id, row]))

  return (
    <div className="flex flex-col gap-4">
      <div className={cn('grid grid-cols-2 gap-2.5', installedPartValue != null ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-4')}>
        <Nameplate label="Equipment" value={data.equipment_count} sub="Jumlah equipment di mesin ini" icon={Boxes} />
        <Nameplate label="PM Terjadwal" value={data.upcoming_tasks.length} sub="WO pending/sedang dikerjakan" icon={CalendarClock} />
        <Nameplate
          label="PM Terlambat"
          value={data.overdue_task_count}
          sub="Dari PM terjadwal di atas"
          icon={AlertTriangle}
          tone={data.overdue_task_count > 0 ? 'destructive' : 'default'}
        />
        <Nameplate
          label="Rata-rata Umur Pakai"
          value={data.average_lifetime_hours != null ? `${data.average_lifetime_hours} jam` : '-'}
          sub="Dari part yang aktif terpasang"
          icon={Gauge}
        />
        {installedPartValue != null && (
          <Nameplate
            label="Nilai Part Terpasang"
            value={currencyFormatter.format(Number(installedPartValue))}
            sub="Harga modal part yang sedang terpasang"
            icon={Wallet}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingDown className="size-4" />
              Tren Failure / Breakdown (12 Bulan Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyFailureChart data={data.monthly_failure_trend} />
          </CardContent>
        </PanelCard>

        <PanelCard>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Part Terpakai per Bulan (12 Bulan Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyConsumptionChart data={data.monthly_consumption_trend} />
          </CardContent>
        </PanelCard>
      </div>

      <PanelCard>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Part Terpakai</CardTitle>
        </CardHeader>
        <CardContent>
          {data.top_parts_consumed.length === 0 ? (
            <EmptyState title="Belum ada pemakaian part tercatat." />
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.top_parts_consumed.map((row) => (
                <div key={row.part_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.part_name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{row.item_master_no}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums">{row.quantity} unit</p>
                    {row.cost != null && (
                      <p className="text-xs text-muted-foreground tabular-nums">{currencyFormatter.format(Number(row.cost))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </PanelCard>

      <PanelCard>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Part per Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          {installationsByEquipment.size === 0 ? (
            <EmptyState title="Belum ada part yang tercatat terpasang di equipment manapun." />
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from(installationsByEquipment.entries()).map(([equipmentId, group]) => (
                <div key={equipmentId} className="flex flex-col gap-1.5">
                  <Link to={`/equipment/${equipmentId}`} className="text-sm font-medium hover:underline">
                    {group.name}
                  </Link>
                  <div className="flex flex-col gap-1.5 pl-3">
                    {group.installations.map((installation) => {
                      const history = historicalLifetimeByPartId.get(installation.part_id)
                      return (
                        <div key={installation.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-muted-foreground">{installation.part_name}</span>
                          <div className="shrink-0 text-right text-muted-foreground">
                            {installation.percent_used != null ? (
                              <span className="tabular-nums">{Math.round(installation.percent_used)}% terpakai</span>
                            ) : (
                              <span className="tabular-nums">
                                Pasang {installDateLabel(installation.installed_at)} · {installation.age_in_days} hari
                                {installation.age_in_runtime_hours != null && ` · ${installation.age_in_runtime_hours} jam mesin`}
                              </span>
                            )}
                            {history && (
                              <p className="tabular-nums">
                                Riwayat: rata-rata {history.average_runtime_hours} jam ({history.sample_count}x ganti)
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </PanelCard>

      {costByEquipmentThisYear && (
        <PanelCard>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Konsumsi Biaya per Equipment (Tahun Ini)</CardTitle>
          </CardHeader>
          <CardContent>
            {costByEquipmentThisYear.length === 0 ? (
              <EmptyState title="Belum ada konsumsi part tercatat tahun ini." />
            ) : (
              <div className="flex flex-col gap-1.5">
                {costByEquipmentThisYear.map((row) => (
                  <div key={row.equipment_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <Link to={`/equipment/${row.equipment_id}`} className="min-w-0 truncate font-medium hover:underline">
                      {row.equipment_name}
                    </Link>
                    <p className="shrink-0 font-medium tabular-nums">{currencyFormatter.format(Number(row.cost))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </PanelCard>
      )}

      <PanelCard>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Jadwal Maintenance Mendatang</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.upcoming_tasks.length === 0 ? (
            <EmptyState title="Tidak ada PM yang sedang terjadwal." />
          ) : (
            data.upcoming_tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{task.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{task.equipment_name ?? '-'}</p>
                </div>
                <div className="shrink-0 text-right">
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(task.due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </p>
                  )}
                  {task.is_overdue && (
                    <Badge variant="destructive" className="mt-0.5">
                      Terlambat
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </PanelCard>

      <PanelCard>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Life Time Part Terpasang</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.installations.length === 0 ? (
            <EmptyState title="Belum ada part yang tercatat terpasang." />
          ) : (
            data.installations.map((installation) => (
              <div key={installation.id} className="flex flex-col gap-1.5 rounded-md border p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{installation.part_name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {installation.item_master_no} · {installation.equipment_name ?? '-'}
                    </p>
                  </div>
                  {installation.percent_used != null && (
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {Math.round(installation.percent_used)}%
                    </span>
                  )}
                </div>
                {installation.percent_used != null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', percentUsedClass(installation.percent_used))}
                      style={{ width: `${Math.min(100, installation.percent_used)}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Pasang {installDateLabel(installation.installed_at)} · {installation.age_in_days} hari
                  {installation.age_in_runtime_hours != null && ` · ${installation.age_in_runtime_hours} jam mesin`}
                  {installation.remaining_hours != null && ` · Sisa ${installation.remaining_hours} jam`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </PanelCard>
    </div>
  )
}
