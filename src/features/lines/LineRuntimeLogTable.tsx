import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchLineRuntimeLogs } from '@/features/lines/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LineRuntimeLogTable({ lineId }: { lineId: number }) {
  const [page, setPage] = useState(1)

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['line-runtime-logs', lineId, page],
    queryFn: () => fetchLineRuntimeLogs(lineId, page),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />

  const logs = data?.data ?? []

  if (page === 1 && logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada catatan jam operasi untuk line ini.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Reading Sebelumnya</TableHead>
              <TableHead className="text-right">Reading Baru</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Dicatat oleh</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {log.previous_hours}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{log.new_hours}</TableCell>
                <TableCell className="text-right tabular-nums text-success">+{log.hours_added}</TableCell>
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
