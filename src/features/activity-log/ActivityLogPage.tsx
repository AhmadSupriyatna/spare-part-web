import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { fetchActivityLog, type ActivityLogEntry } from '@/features/activity-log/api'
import { useBranchStore } from '@/stores/branch-store'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function firstOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'ya' : 'tidak'
  return String(value)
}

const eventVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  created: 'success',
  updated: 'warning',
  deleted: 'destructive',
}

const eventLabels: Record<string, string> = {
  created: 'Ditambahkan',
  updated: 'Diubah',
  deleted: 'Dihapus',
}

function ChangesPopover({ entry }: { entry: ActivityLogEntry }) {
  if (entry.changes.length === 0) return <span className="text-muted-foreground">-</span>

  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className="underline-offset-2 hover:underline" />}>
        <Badge variant="outline">{entry.changes.length} field</Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72" side="left">
        <div className="flex flex-col gap-1.5 text-xs">
          {entry.changes.map((change) => (
            <div key={change.field} className="flex flex-col gap-0.5 border-b pb-1.5 last:border-0 last:pb-0">
              <span className="font-mono font-medium">{change.field}</span>
              <span className="text-muted-foreground">
                {formatValue(change.old)} → <span className="text-foreground">{formatValue(change.new)}</span>
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ActivityLogPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity-log', activeBranchId, from, to],
    queryFn: () => fetchActivityLog(activeBranchId!, { from: from || undefined, to: to || undefined }),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Log Aktivitas"
        description="Riwayat siapa melakukan apa di plant ini — supplier, lokasi/rak, budget, pemasangan part, breakdown, dan perbaikan part."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-from">Dari Tanggal</Label>
          <Input id="log-from" type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-to">Sampai Tanggal</Label>
          <Input id="log-to" type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : !entries || entries.length === 0 ? (
        <EmptyState icon={History} title="Tidak ada aktivitas pada rentang ini" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detail Perubahan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{entry.subject_label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={eventVariants[entry.event] ?? 'secondary'}>
                    {eventLabels[entry.event] ?? entry.event}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChangesPopover entry={entry} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
