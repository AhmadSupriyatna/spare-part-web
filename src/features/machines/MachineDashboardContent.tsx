import { AlertTriangle, Boxes, CalendarClock, Gauge, ScanLine, Timer, TrendingDown, Wallet, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import type { CostByEquipment, MachineMonitoringData } from '@/features/machines/api'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { Nameplate } from '@/components/Nameplate'
import { PanelCard } from '@/components/PanelCard'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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

/** Qty-based (primary hue) — cost, when present, only ever shows in the hover title, never as visible text, so this chart renders identically whether or not the caller has cost access. */
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

/** Cost-only chart (amber hue, matches the app's money-figure convention) — only ever rendered when every month already carries a `cost`, i.e. authenticated. */
function MonthlyCostChart({ data }: { data: { month: string; cost: string }[] }) {
  const values = data.map((d) => Number(d.cost))
  const max = Math.max(1, ...values)
  const total = values.reduce((sum, v) => sum + v, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada biaya konsumsi part tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((d) => {
        const value = Number(d.cost)
        return (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
            <span className="text-[9px] font-medium tabular-nums text-foreground">
              {value > 0 ? currencyFormatter.format(value).replace('Rp', '').trim() : ''}
            </span>
            <div className="flex h-16 w-full items-end" title={`${monthLabel(d.month)}: ${currencyFormatter.format(value)}`}>
              <div
                className={cn('w-full rounded-t', value > 0 ? 'bg-warning' : 'bg-muted')}
                style={{ height: `${value > 0 ? Math.max((value / max) * 100, 6) : 3}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
          </div>
        )
      })}
    </div>
  )
}

function installDateLabel(installedAt: string): string {
  return new Date(installedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

interface MachineDashboardContentProps {
  data: MachineMonitoringData
  /** Gates every cost-bearing tile/chart (Nilai Part Terpasang, Trend Cost, Konsumsi Biaya per Equipment) — everything else renders identically either way, just without a cost figure to show. */
  installedPartValue?: string
  costByEquipmentThisYear?: CostByEquipment[]
}

/**
 * Everything below a Machine's own header card — shared by the public
 * QR-scan "Monitoring Life Time Mesin" page and the authenticated Machine
 * Detail page, so the two stay visually identical except for cost figures.
 * "Part per Equipment" is built client-side from the flat `installations`
 * list, which already carries equipment_id/equipment_name per row, so no
 * separate endpoint/shape was needed just to present it as one table.
 */
export function MachineDashboardContent({ data, installedPartValue, costByEquipmentThisYear }: MachineDashboardContentProps) {
  const hasCost = installedPartValue != null
  const historicalLifetimeByPartId = new Map(data.historical_part_lifetime.map((row) => [row.part_id, row]))
  const sortedInstallations = [...data.installations].sort((a, b) =>
    (a.equipment_name ?? '').localeCompare(b.equipment_name ?? ''),
  )
  const hasPassportInstalled = data.installations.some((installation) => installation.has_passport)

  return (
    <div className="flex flex-col gap-4">
      <div className={cn('grid grid-cols-2 gap-2.5', hasCost ? 'sm:grid-cols-3 lg:grid-cols-7' : 'sm:grid-cols-3 lg:grid-cols-6')}>
        <Nameplate
          label="Running Hours"
          value={data.line_runtime_hours != null ? `${data.line_runtime_hours} jam` : '-'}
          sub="Jam operasi Line saat ini"
          icon={Timer}
        />
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
        {hasCost && (
          <Nameplate
            label="Nilai Part Terpasang"
            value={currencyFormatter.format(Number(installedPartValue))}
            sub="Harga modal part yang sedang terpasang"
            icon={Wallet}
          />
        )}
      </div>

      <div className={cn('grid grid-cols-1 gap-4', hasCost ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        <PanelCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingDown className="size-4" />
              Tren Failure / Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyFailureChart data={data.monthly_failure_trend} />
          </CardContent>
        </PanelCard>

        <PanelCard>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Part Terpakai per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyConsumptionChart data={data.monthly_consumption_trend} />
          </CardContent>
        </PanelCard>

        {hasCost && (
          <PanelCard>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tren Biaya per Bulan</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyCostChart data={data.monthly_consumption_trend as { month: string; cost: string }[]} />
            </CardContent>
          </PanelCard>
        )}
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

      <div className={cn('grid grid-cols-1 gap-4', costByEquipmentThisYear ? 'lg:grid-cols-[3fr_1fr]' : '')}>
        <PanelCard>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Part per Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedInstallations.length === 0 ? (
              <EmptyState title="Belum ada part yang tercatat terpasang di equipment manapun." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>Terpasang Sejak</TableHead>
                      <TableHead>Lama Terpasang</TableHead>
                      <TableHead>Life Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInstallations.map((installation) => {
                      const history = historicalLifetimeByPartId.get(installation.part_id)
                      return (
                        <TableRow key={installation.id}>
                          <TableCell>
                            <Link to={`/equipment/${installation.equipment_id}`} className="hover:underline">
                              {installation.equipment_name ?? '-'}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              <span>{installation.part_name}</span>
                              {installation.has_passport && (
                                <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-[10px] text-primary">
                                  <ScanLine className="size-3" />
                                  Passport
                                </Badge>
                              )}
                              {installation.was_repaired && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                >
                                  <Wrench className="size-3" />
                                  Bekas Repair
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{installDateLabel(installation.installed_at)}</TableCell>
                          <TableCell className="text-muted-foreground">{installation.age_in_days} hari</TableCell>
                          <TableCell>
                            {installation.percent_used != null ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium tabular-nums">
                                  Sisa {Math.max(0, 100 - Math.round(installation.percent_used))}%
                                </span>
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      installation.percent_used >= 100
                                        ? 'bg-destructive'
                                        : installation.percent_used >= 80
                                          ? 'bg-warning'
                                          : 'bg-success',
                                    )}
                                    style={{ width: `${Math.min(100, installation.percent_used)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                <p className="tabular-nums">
                                  {installation.age_in_runtime_hours != null ? `${installation.age_in_runtime_hours} jam mesin` : '-'}
                                </p>
                                {history && (
                                  <p className="tabular-nums">
                                    Riwayat: rata-rata {history.average_runtime_hours} jam ({history.sample_count}x ganti)
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
                <div className="flex flex-col gap-2.5">
                  {costByEquipmentThisYear.map((row) => {
                    const max = Math.max(...costByEquipmentThisYear.map((r) => Number(r.cost)), 1)
                    const widthPercent = Math.max((Number(row.cost) / max) * 100, 4)
                    return (
                      <div key={row.equipment_id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <Link to={`/equipment/${row.equipment_id}`} className="min-w-0 truncate font-medium hover:underline">
                            {row.equipment_name}
                          </Link>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{currencyFormatter.format(Number(row.cost))}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-warning" style={{ width: `${widthPercent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </PanelCard>
        )}
      </div>

      {hasPassportInstalled && (
        <PanelCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ScanLine className="size-4" />
              Riwayat Part Passport Terpasang
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.passport_install_history.length === 0 ? (
              <EmptyState title="Belum ada riwayat unit Passport di mesin ini." />
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.passport_install_history.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {row.part_name} <span className="font-mono text-xs text-muted-foreground">{row.unit_code}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{row.equipment_name}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>Pasang {installDateLabel(row.installed_at)}</p>
                      {row.is_active ? (
                        <Badge variant="success" className="mt-0.5">
                          Masih Terpasang
                        </Badge>
                      ) : (
                        row.removed_at && <p>Lepas {installDateLabel(row.removed_at)}</p>
                      )}
                    </div>
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
    </div>
  )
}
