import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchLineKwhLogs } from '@/features/lines/api'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function weekLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function LineKwhLogTable({ lineId }: { lineId: number }) {
  const [page, setPage] = useState(1)

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['line-kwh-logs', lineId, page],
    queryFn: () => fetchLineKwhLogs(lineId, page),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />

  const logs = data?.data ?? []

  if (page === 1 && logs.length === 0) {
    return <EmptyState title="Belum ada catatan kWh untuk line ini." />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Minggu</TableHead>
              <TableHead className="text-right">Reading Sebelumnya</TableHead>
              <TableHead className="text-right">Reading Baru</TableHead>
              <TableHead className="text-right">Pemakaian (kWh)</TableHead>
              <TableHead className="text-right">kVA</TableHead>
              <TableHead className="text-right">PF</TableHead>
              <TableHead>Dicatat oleh</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">{weekLabel(log.week_start_date)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {log.previous_reading ?? '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {log.new_reading ?? '-'}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-success">{log.kwh_used}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{log.kva_used ?? '-'}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{log.pf != null ? log.pf.toFixed(2) : '-'}</TableCell>
                <TableCell className="text-muted-foreground">{log.recorded_by_name ?? '-'}</TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground" title={log.notes ?? ''}>
                  {log.notes ?? '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {data.meta.current_page} dari {data.meta.last_page} &middot; {data.meta.total} catatan
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPlaceholderData}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.last_page || isPlaceholderData}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Berikutnya
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
