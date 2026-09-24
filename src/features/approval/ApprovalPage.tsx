import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { approveReplacementRequest, fetchReplacementRequests } from '@/features/breakdown/api'
import { RejectRequestDialog } from '@/features/breakdown/RejectRequestDialog'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { InstallationMultiSelectPicker } from '@/features/part-installations/InstallationMultiSelectPicker'
import { InstallationSlotPicker } from '@/features/part-installations/InstallationSlotPicker'
import {
  approvePartUnitActionRequest,
  fetchPartUnitActionRequests,
} from '@/features/part-unit-actions/api'
import { RejectPartUnitActionDialog } from '@/features/part-unit-actions/RejectPartUnitActionDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanApprove, useHasRole } from '@/stores/use-has-role'
import type { ReplacementRequestStatus, ReplacementRequest } from '@/types/breakdown'
import type { PartUnitActionRequest } from '@/types/part-unit-actions'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<ReplacementRequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

type UnifiedRow =
  | { origin: 'breakdown'; id: number; data: ReplacementRequest }
  | { origin: 'repair'; id: number; data: PartUnitActionRequest }

function originBadge(row: UnifiedRow) {
  if (row.origin === 'breakdown') {
    if (row.data.event_type === 'failure') {
      return <Badge variant="warning">Failure</Badge>
    }
    if (row.data.event_type === 'maintenance') {
      return <Badge variant="secondary">Maintenance</Badge>
    }
    return <Badge variant="destructive">Breakdown</Badge>
  }
  if (row.data.action === 'reinstall') {
    return <Badge variant="warning">Part Hasil Repair</Badge>
  }
  return <Badge variant="secondary">Lepas Manual (Arsip)</Badge>
}

function rowFields(row: UnifiedRow) {
  if (row.origin === 'breakdown') {
    const r = row.data
    return {
      created_at: r.created_at,
      part_name: r.part_name,
      item_master_no: r.item_master_no,
      location: `${r.equipment_name} · ${r.machine_name} · ${r.line_name}`,
      requested_by_name: r.requested_by_name,
      detail: r.reason,
      quantity: r.quantity_used,
      reviewed_by_name: r.reviewed_by_name,
      review_notes: r.review_notes,
    }
  }

  const r = row.data
  return {
    created_at: r.created_at,
    part_name: r.part_name ?? `Unit ${r.unit_code ?? '?'}`,
    item_master_no: r.item_master_no ?? '-',
    location: [r.equipment_name, r.machine_name, r.line_name].filter(Boolean).join(' · ') || '-',
    requested_by_name: r.requested_by_name,
    detail: r.notes,
    quantity: 1,
    reviewed_by_name: r.reviewed_by_name,
    review_notes: r.review_notes,
  }
}

/**
 * quantity_used = 1 and at most one active installation of this part —
 * auto-resolved server-side, no need to ask. quantity_used = 1 but more
 * than one active installation shows the single-pick A/B/C list (tapping
 * one both selects and approves in the same motion, like before).
 * quantity_used > 1 always requires an explicit multi-select of exactly
 * quantity_used units — never auto-resolved, since there's no single
 * correct guess for which N of several active units broke.
 */
function ApproveReplacementAction({
  request,
  onApprove,
  isPending,
}: {
  request: ReplacementRequest
  onApprove: (oldInstallationIds: number[]) => void
  isPending: boolean
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: installations } = useQuery({
    queryKey: ['part-installations', request.equipment_id],
    queryFn: () => fetchPartInstallations(request.equipment_id),
  })

  const activeSamePart = (installations ?? []).filter(
    (installation) => installation.part_id === request.part_id && installation.is_active,
  )

  if (request.quantity_used > 1) {
    return (
      <InstallationMultiSelectPicker
        installations={activeSamePart}
        requiredCount={request.quantity_used}
        selectedIds={selectedIds}
        disabled={isPending}
        onToggle={(id) =>
          setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onConfirm={() => onApprove(selectedIds)}
      />
    )
  }

  if (activeSamePart.length > 1) {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-[11px] text-muted-foreground">Pilih unit yang diganti:</p>
        <InstallationSlotPicker
          installations={activeSamePart}
          disabled={isPending}
          onSelect={(installation) => onApprove([installation.id])}
        />
      </div>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" disabled={isPending} />}>Setujui</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Setujui penggantian part ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Part lama di <strong>{request.equipment_name}</strong> akan dilepas dan stok otomatis
            berkurang. Tindakan ini tidak bisa dibatalkan begitu diproses.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={() => onApprove([])}>Setujui</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ApproveRepairAction({ request, onApprove, isPending }: { request: PartUnitActionRequest; onApprove: () => void; isPending: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" disabled={isPending} />}>Setujui</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Setujui pemasangan unit ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Unit <strong>{request.unit_code}</strong> ({request.part_name}) akan dipasang ke{' '}
            <strong>{request.equipment_name}</strong> begitu disetujui.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onApprove}>Setujui</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Split off from Workspace into its own page/nav item — Engineer/Supervisor/
 * Superadmin can all view every board; only useCanApprove() (Supervisor/
 * Superadmin) actually gets the Setujui/Tolak controls. Admin Spare Part
 * never sees this at all (hidden from nav, and blocked here too in case of
 * a direct link).
 *
 * Unified into one table (2026-09-19): Breakdown replacement and QR-unit
 * "Pasang" requests used to sit in separate tabs, which made it easy to
 * miss one board while checking the other. Both are the same kind of
 * decision — approve an installation — so they now share one table, one
 * status switch, and an "Asal" column marking where each request actually
 * came from (Breakdown vs a repaired unit's QR). A bare "Lepas" (remove
 * with no replacement in the same action) is no longer something anyone
 * can submit — see StorePartUnitActionRequest — so "Lepas Manual (Arsip)"
 * only ever shows up for the handful of pre-existing historical rows.
 */
export function ApprovalPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canSeeApprovalBoard = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const canApprove = useCanApprove()

  if (!canSeeApprovalBoard) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Tidak punya akses"
        description="Approval hanya bisa dibuka oleh Engineer, Supervisor, atau Superadmin."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Approval"
        description="Semua permintaan yang butuh persetujuan — breakdown maupun pemasangan unit hasil repair — dalam satu tempat."
      />

      {!activeBranchId ? (
        <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Menunggu</TabsTrigger>
            <TabsTrigger value="approved">Disetujui</TabsTrigger>
            <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <ApprovalTable branchId={activeBranchId} status="pending" canApprove={canApprove} />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <ApprovalTable branchId={activeBranchId} status="approved" canApprove={canApprove} />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <ApprovalTable branchId={activeBranchId} status="rejected" canApprove={canApprove} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function ApprovalTable({
  branchId,
  status,
  canApprove,
}: {
  branchId: number
  status: ReplacementRequestStatus
  canApprove: boolean
}) {
  const queryClient = useQueryClient()

  const { data: replacementRequests, isLoading: replacementLoading } = useQuery({
    queryKey: ['replacement-requests', branchId, status],
    queryFn: () => fetchReplacementRequests(branchId, status),
  })

  const { data: unitActionRequests, isLoading: unitActionLoading } = useQuery({
    queryKey: ['part-unit-action-requests', branchId, status],
    queryFn: () => fetchPartUnitActionRequests(branchId, status),
  })

  const approveReplacementMutation = useMutation({
    mutationFn: ({ id, oldInstallationIds }: { id: number; oldInstallationIds: number[] }) =>
      approveReplacementRequest(id, undefined, oldInstallationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replacement-requests', branchId] })
      toast.success('Penggantian disetujui — part lama dilepas, stok otomatis berkurang.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyetujui permintaan.'
      toast.error(message)
      queryClient.invalidateQueries({ queryKey: ['replacement-requests', branchId] })
    },
  })

  const approveRepairMutation = useMutation({
    mutationFn: (id: number) => approvePartUnitActionRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-unit-action-requests', branchId] })
      toast.success('Disetujui — unit resmi terpasang.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyetujui permintaan.'
      toast.error(message)
      queryClient.invalidateQueries({ queryKey: ['part-unit-action-requests', branchId] })
    },
  })

  const rows: UnifiedRow[] = useMemo(() => {
    const breakdownRows: UnifiedRow[] = (replacementRequests ?? []).map((r) => ({
      origin: 'breakdown',
      id: r.id,
      data: r,
    }))
    const repairRows: UnifiedRow[] = (unitActionRequests ?? []).map((r) => ({
      origin: 'repair',
      id: r.id,
      data: r,
    }))
    return [...breakdownRows, ...repairRows].sort(
      (a, b) => new Date(rowFields(b).created_at).getTime() - new Date(rowFields(a).created_at).getTime(),
    )
  }, [replacementRequests, unitActionRequests])

  if (replacementLoading || unitActionLoading) return <Skeleton className="h-40 w-full" />

  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title={`Tidak ada permintaan ${statusLabels[status].toLowerCase()}`} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal</TableHead>
          <TableHead>Part</TableHead>
          <TableHead>Equipment / Lokasi</TableHead>
          <TableHead>Asal</TableHead>
          <TableHead>Diajukan oleh</TableHead>
          <TableHead>Keterangan</TableHead>
          <TableHead className="text-right">Jumlah</TableHead>
          {status !== 'pending' && <TableHead>Ditinjau oleh</TableHead>}
          {status === 'pending' && canApprove && <TableHead className="text-right">Aksi</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const f = rowFields(row)
          return (
            <TableRow key={`${row.origin}-${row.id}`}>
              <TableCell className="text-muted-foreground">
                {new Date(f.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </TableCell>
              <TableCell>
                <div className="font-medium">{f.part_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{f.item_master_no}</div>
              </TableCell>
              <TableCell className="text-muted-foreground">{f.location}</TableCell>
              <TableCell>{originBadge(row)}</TableCell>
              <TableCell>{f.requested_by_name}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground" title={f.detail ?? ''}>
                {f.detail ?? '-'}
              </TableCell>
              <TableCell className="text-right">{f.quantity}</TableCell>
              {status !== 'pending' && (
                <TableCell className="text-muted-foreground">
                  {f.reviewed_by_name ?? '-'}
                  {f.review_notes && <div className="text-xs italic">"{f.review_notes}"</div>}
                </TableCell>
              )}
              {status === 'pending' && canApprove && (
                <TableCell className="flex items-start justify-end gap-2">
                  {row.origin === 'breakdown' ? (
                    <>
                      <ApproveReplacementAction
                        request={row.data}
                        isPending={approveReplacementMutation.isPending}
                        onApprove={(oldInstallationIds) =>
                          approveReplacementMutation.mutate({ id: row.id, oldInstallationIds })
                        }
                      />
                      <RejectRequestDialog requestId={row.id} branchId={branchId} />
                    </>
                  ) : (
                    <>
                      <ApproveRepairAction
                        request={row.data}
                        isPending={approveRepairMutation.isPending}
                        onApprove={() => approveRepairMutation.mutate(row.id)}
                      />
                      <RejectPartUnitActionDialog requestId={row.id} branchId={branchId} />
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
