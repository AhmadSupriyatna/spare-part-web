import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchMaintenanceHistory } from '@/features/maintenance-history/api'
import { fetchParts } from '@/features/parts/api'
import { FindingDetailSheet } from '@/features/findings/FindingDetailSheet'
import type { MaintenanceHistoryEntry } from '@/types/maintenance-history'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'

const RESULT_LABELS: Record<string, string> = {
  pass: 'PASS',
  monitor: 'MONITOR',
  action_required: 'ACTION REQUIRED',
  fail: 'FAIL',
}

const RESULT_VARIANTS: Record<string, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  pass: 'success',
  monitor: 'secondary',
  action_required: 'warning',
  fail: 'destructive',
}

const SEVERITY_LABELS: Record<string, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
}

const SEVERITY_VARIANTS: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  critical: 'destructive',
}

/**
 * Phase 2 Step 6 — Finding & Action UI. Reuses the Step 5 Maintenance
 * History endpoint filtered to event_type=FINDING (no new backend list
 * endpoint) — equipment/result/severity/decision-status filters run
 * client-side over that one fetch, date range is the only filter sent to
 * the server, matching "don't build a new query when an existing one is
 * enough."
 */
export function FindingActionView({ branchId }: { branchId: number }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState<string>(ALL)
  const [partFilter, setPartFilter] = useState<string>(ALL)
  const [resultFilter, setResultFilter] = useState<string>(ALL)
  const [severityFilter, setSeverityFilter] = useState<string>(ALL)
  const [decisionStatusFilter, setDecisionStatusFilter] = useState<string>(ALL)
  const [selected, setSelected] = useState<MaintenanceHistoryEntry | null>(null)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['findings', branchId, dateFrom, dateTo],
    queryFn: () =>
      fetchMaintenanceHistory(branchId, {
        event_type: 'FINDING',
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  })

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts })

  const equipmentOptions = useMemo(() => {
    const map = new Map<number, string>()
    entries?.forEach((entry) => {
      if (entry.equipment_id && entry.equipment) map.set(entry.equipment_id, entry.equipment)
    })
    return Array.from(map.entries())
  }, [entries])

  const filtered = useMemo(() => {
    return (entries ?? []).filter((entry) => {
      if (equipmentFilter !== ALL && String(entry.equipment_id) !== equipmentFilter) return false
      if (partFilter !== ALL && String(entry.part_id) !== partFilter) return false
      if (resultFilter !== ALL && entry.finding?.result !== resultFilter) return false
      if (severityFilter !== ALL && entry.finding?.severity !== severityFilter) return false
      if (decisionStatusFilter === 'decided' && !entry.decision) return false
      if (decisionStatusFilter === 'undecided' && entry.decision) return false
      return true
    })
  }, [entries, equipmentFilter, partFilter, resultFilter, severityFilter, decisionStatusFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Equipment</Label>
          <Select value={equipmentFilter} onValueChange={(v) => setEquipmentFilter(v ?? ALL)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Equipment</SelectItem>
              {equipmentOptions.map(([id, name]) => (
                <SelectItem key={id} value={String(id)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Part</Label>
          <Select value={partFilter} onValueChange={(v) => setPartFilter(v ?? ALL)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Part</SelectItem>
              {parts?.map((part) => (
                <SelectItem key={part.id} value={String(part.id)}>
                  {part.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Result</Label>
          <Select value={resultFilter} onValueChange={(v) => setResultFilter(v ?? ALL)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              {Object.entries(RESULT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Severity</Label>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? ALL)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status Decision</Label>
          <Select value={decisionStatusFilter} onValueChange={(v) => setDecisionStatusFilter(v ?? ALL)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              <SelectItem value="undecided">Belum Diputuskan</SelectItem>
              <SelectItem value="decided">Sudah Diputuskan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="finding-from">Dari Tanggal</Label>
          <Input id="finding-from" type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="finding-to">Sampai Tanggal</Label>
          <Input id="finding-to" type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Tidak ada Finding yang sesuai filter" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Equipment / Part</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead>Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TableRow key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.event_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.equipment ?? '-'}
                  {entry.part && <span className="block text-xs">{entry.part}</span>}
                </TableCell>
                <TableCell>
                  {entry.finding && (
                    <Badge variant={RESULT_VARIANTS[entry.finding.result] ?? 'secondary'}>
                      {RESULT_LABELS[entry.finding.result] ?? entry.finding.result}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {entry.finding?.severity && (
                    <Badge variant={SEVERITY_VARIANTS[entry.finding.severity] ?? 'secondary'}>
                      {SEVERITY_LABELS[entry.finding.severity] ?? entry.finding.severity}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[240px] truncate" title={entry.description ?? ''}>
                  {entry.description}
                </TableCell>
                <TableCell className="text-muted-foreground">{entry.performed_by ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={entry.decision ? 'success' : 'outline'}>
                    {entry.decision ? 'Sudah Diputuskan' : 'Belum Diputuskan'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <FindingDetailSheet branchId={branchId} entry={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
