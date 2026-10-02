import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Boxes, CalendarClock, Gauge, TrendingDown } from 'lucide-react'
import { useParams } from 'react-router'
import { fetchMachineMonitoring } from '@/features/machines/api'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

function StatTile({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: 'destructive' | 'warning' }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            tone === 'destructive' ? 'bg-destructive/10 text-destructive' : tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Thin bars, one hue (destructive — this is a failure count, not routine usage), rounded top, count shown above each bar. Mirrors Part Detail's MonthlyUsageChart. */
function MonthlyFailureChart({ data }: { data: { month: string; count: number }[] }) {
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

function percentUsedClass(percent: number): string {
  if (percent >= 100) return 'bg-destructive'
  if (percent >= 80) return 'bg-warning'
  return 'bg-success'
}

export function MachineMonitoringPage() {
  const { machineId } = useParams<{ machineId: string }>()
  const id = Number(machineId)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-machine-monitoring', id],
    queryFn: () => fetchMachineMonitoring(id),
    enabled: Number.isFinite(id),
  })

  return (
    <div className="min-h-svh bg-muted/40 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </>
        ) : isError || !data ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              Mesin tidak ditemukan, atau QR ini sudah tidak berlaku.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-1 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">{data.machine.name}</h1>
                  {!data.machine.is_active && <Badge variant="secondary">Nonaktif</Badge>}
                  {data.machine.category && <Badge variant="outline">{data.machine.category}</Badge>}
                </div>
                <p className="font-mono text-sm text-muted-foreground">{data.machine.code}</p>
                <p className="text-sm text-muted-foreground">
                  {data.machine.line_id != null
                    ? `Line ${data.machine.line_name ?? '-'}`
                    : `Luar Line — ${data.machine.branch_name ?? '-'}`}
                  {' · '}
                  {data.equipment_count} equipment
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon={Boxes} label="Equipment" value={String(data.equipment_count)} />
              <StatTile icon={CalendarClock} label="PM Terjadwal" value={String(data.upcoming_tasks.length)} />
              <StatTile
                icon={AlertTriangle}
                label="PM Terlambat"
                value={String(data.overdue_task_count)}
                tone={data.overdue_task_count > 0 ? 'destructive' : undefined}
              />
              <StatTile
                icon={Gauge}
                label="Rata-rata Umur Pakai"
                value={data.average_lifetime_hours != null ? `${data.average_lifetime_hours} jam` : '-'}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="size-4" />
                  Tren Failure / Breakdown (12 Bulan Terakhir)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyFailureChart data={data.monthly_failure_trend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jadwal Maintenance Mendatang</CardTitle>
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
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Life Time Part Terpasang</CardTitle>
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
                        Usia {installation.age_in_days} hari
                        {installation.remaining_hours != null && ` · Sisa ${installation.remaining_hours} jam`}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
