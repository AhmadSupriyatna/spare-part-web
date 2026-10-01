import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
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
import { cn } from '@/lib/utils'
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

/** Left-edge accent strip — mirrors the same color the Asal badge already uses, so the card reads as "what kind of request" at a glance without needing to read the badge text first (same idea as Kelola Stok's stock-health strip). */
function originAccentClass(row: UnifiedRow): string {
  if (row.origin === 'breakdown') {
    if (row.data.event_type === 'failure') return 'border-l-warning'
    if (row.data.event_type === 'maintenance') return 'border-l-border'
    return 'border-l-destructive'
  }
  if (row.data.action === 'reinstall') return 'border-l-warning'
  return 'border-l-border'
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
 * Unified into one list (2026-09-19): Breakdown replacement and QR-unit
 * "Pasang" requests used to sit in separate tabs, which made it easy to
 * miss one board while checking the other. Both are the same kind of
 * decision — approve an installation — so they now share one card list
 * (rendered as list cards, not a table — see ApprovalCard), one status
 * switch, and an Asal badge marking where each request actually
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
            <ApprovalList branchId={activeBranchId} status="pending" canApprove={canApprove} />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <ApprovalList branchId={activeBranchId} status="approved" canApprove={canApprove} />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <ApprovalList branchId={activeBranchId} status="rejected" canApprove={canApprove} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function ApprovalList({
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
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <ApprovalCard
          key={`${row.origin}-${row.id}`}
          row={row}
          status={status}
          canApprove={canApprove}
          branchId={branchId}
          approveReplacementMutation={approveReplacementMutation}
          approveRepairMutation={approveRepairMutation}
        />
      ))}
    </div>
  )
}

interface ApprovalCardProps {
  row: UnifiedRow
  status: ReplacementRequestStatus
  canApprove: boolean
  branchId: number
  approveReplacementMutation: UseMutationResult<ReplacementRequest, unknown, { id: number; oldInstallationIds: number[] }>
  approveRepairMutation: UseMutationResult<PartUnitActionRequest, unknown, number>
}

/**
 * One "list card" per request — same visual language as Kelola Stok's
 * part rows (rounded border, left-edge color strip, thin content blocks)
 * but as a full card instead of a dense grid row, since an approval
 * action can expand into a multi-unit picker that needs real vertical
 * room. The left strip reuses the Asal badge's own color so the kind of
 * request reads at a glance.
 */
function ApprovalCard({ row, status, canApprove, branchId, approveReplacementMutation, approveRepairMutation }: ApprovalCardProps) {
  const f = rowFields(row)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-l-4 bg-card p-4 shadow-sm',
        originAccentClass(row),
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {originBadge(row)}
          <span className="text-xs text-muted-foreground">
            {new Date(f.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Diajukan oleh <span className="font-medium text-foreground">{f.requested_by_name}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{f.part_name}</p>
          <p className="font-mono text-xs text-muted-foreground">{f.item_master_no}</p>
          <p className="mt-1 text-sm text-muted-foreground">{f.location}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Jumlah</p>
          <p className="font-semibold tabular-nums">{f.quantity}</p>
        </div>
      </div>

      {f.detail && (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{f.detail}</p>
      )}

      {status !== 'pending' && (
        <div className="border-t pt-3 text-sm text-muted-foreground">
          Ditinjau oleh <span className="font-medium text-foreground">{f.reviewed_by_name ?? '-'}</span>
          {f.review_notes && <p className="mt-0.5 text-xs italic">"{f.review_notes}"</p>}
        </div>
      )}

      {status === 'pending' && canApprove && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
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
        </div>
      )}
    </div>
  )
}
