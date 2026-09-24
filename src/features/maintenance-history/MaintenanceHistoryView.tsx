import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { fetchMaintenanceHistory } from '@/features/maintenance-history/api'
import type { MaintenanceHistoryEntry, MaintenanceHistoryEventType } from '@/types/maintenance-history'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'

const EVENT_LABELS: Record<MaintenanceHistoryEventType, string> = {
  PM: 'PM',
  FAILURE: 'Failure',
  BREAKDOWN: 'Breakdown',
  MAINTENANCE: 'Maintenance',
  REPAIR: 'Repair',
  FINDING: 'Finding',
  DECISION: 'Decision',
}

const EVENT_VARIANTS: Record<MaintenanceHistoryEventType, 'default' | 'warning' | 'destructive' | 'secondary' | 'outline' | 'success' | 'ghost'> = {
  PM: 'default',
  FAILURE: 'warning',
  BREAKDOWN: 'destructive',
  MAINTENANCE: 'secondary',
  REPAIR: 'outline',
  FINDING: 'success',
  DECISION: 'ghost',
}

function EventBadge({ type }: { type: MaintenanceHistoryEventType }) {
  return <Badge variant={EVENT_VARIANTS[type]}>{EVENT_LABELS[type]}</Badge>
}

/**
 * Phase 2 Step 5 — a read-only aggregated timeline, not a management
 * dashboard: one row per underlying record (Task/Finding/Decision/
 * PartReplacementRequest/PartRepair), see MaintenanceHistoryService for why
 * an approval or a repair-disposition change doesn't get its own row.
 */
export function MaintenanceHistoryView({ branchId }: { branchId: number }) {
  const [eventFilter, setEventFilter] = useState<string>(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<MaintenanceHistoryEntry | null>(null)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['maintenance-history', branchId, eventFilter, dateFrom, dateTo],
    queryFn: () =>
      fetchMaintenanceHistory(branchId, {
        event_type: eventFilter !== ALL ? (eventFilter as MaintenanceHistoryEventType) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Jenis Aktivitas</Label>
          <Select value={eventFilter} onValueChange={(value) => setEventFilter(value ?? ALL)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              {(Object.keys(EVENT_LABELS) as MaintenanceHistoryEventType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {EVENT_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="history-from">Dari Tanggal</Label>
          <Input id="history-from" type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="history-to">Sampai Tanggal</Label>
          <Input id="history-to" type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : !entries || entries.length === 0 ? (
        <EmptyState icon={History} title="Belum ada riwayat maintenance" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Equipment / Part</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.event_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </TableCell>
                <TableCell>
                  <EventBadge type={entry.event_type} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.equipment ?? '-'}
                  {entry.part && <span className="block text-xs">{entry.part}</span>}
                </TableCell>
                <TableCell className="max-w-[280px] truncate" title={entry.title}>
                  {entry.title}
                </TableCell>
                <TableCell className="text-muted-foreground">{entry.status ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{entry.performed_by ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <MaintenanceHistoryDetailSheet entry={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}

function MaintenanceHistoryDetailSheet({
  entry,
  onOpenChange,
}: {
  entry: MaintenanceHistoryEntry | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={!!entry} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="gap-0 p-0" showOverlay={false}>
        {entry && (
          <>
            <div className="flex flex-col gap-1 border-b px-4 py-4 pr-10">
              <div>
                <EventBadge type={entry.event_type} />
              </div>
              <SheetTitle>{entry.title}</SheetTitle>
              <SheetDescription>
                {entry.equipment ?? '-'}
                {entry.part && ` · ${entry.part}`}
              </SheetDescription>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 text-sm">
              {entry.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Deskripsi</p>
                  <p>{entry.description}</p>
                </div>
              )}

              {entry.status && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <p>{entry.status}</p>
                </div>
              )}

              {entry.performed_by && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Oleh</p>
                  <p>{entry.performed_by}</p>
                </div>
              )}

              {entry.finding && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Finding</p>
                  <p>
                    Hasil: <span className="font-medium">{entry.finding.result}</span>
                    {entry.finding.severity && ` · Severity: ${entry.finding.severity}`}
                  </p>
                  {entry.finding.recommendation && <p className="text-muted-foreground">{entry.finding.recommendation}</p>}
                </div>
              )}

              {entry.decision && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Decision</p>
                  <p>
                    {entry.decision.decision}
                    {entry.decision.decided_by && ` — oleh ${entry.decision.decided_by}`}
                  </p>
                </div>
              )}

              {entry.replacement && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Replacement</p>
                  {entry.replacement.quantity_used != null && <p>Quantity: {entry.replacement.quantity_used}</p>}
                  {entry.replacement.reviewed_by && <p>Direview oleh: {entry.replacement.reviewed_by}</p>}
                  {entry.replacement.items.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                      {entry.replacement.items.map((item, i) => (
                        <li key={i}>
                          {item.old_installation
                            ? `${item.old_part} (${item.old_installation})`
                            : entry.event_type === 'PM'
                              ? 'Part lama tidak tercatat'
                              : 'Unit baru'}{' '}
                          → {item.new_part} ({item.new_installation})
                          {item.quantity_used != null && ` · Qty ${item.quantity_used}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {entry.repair && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Repair</p>
                  <p>Disposisi: {entry.repair.disposition}</p>
                  {entry.repair.repair_cost && <p>Biaya: {entry.repair.repair_cost}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
