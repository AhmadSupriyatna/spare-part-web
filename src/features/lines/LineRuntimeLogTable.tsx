import { useQuery } from '@tanstack/react-query'
import { fetchLineRuntimeLogs } from '@/features/lines/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LineRuntimeLogTable({ lineId }: { lineId: number }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['line-runtime-logs', lineId],
    queryFn: () => fetchLineRuntimeLogs(lineId),
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />

  if (logs?.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada catatan jam operasi untuk line ini.</p>
  }

  return (
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
        {logs?.map((log) => (
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
  )
}
