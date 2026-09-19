import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { approveReplacementRequest, fetchReplacementRequests } from '@/features/breakdown/api'
import { RejectRequestDialog } from '@/features/breakdown/RejectRequestDialog'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { InstallationSlotPicker } from '@/features/part-installations/InstallationSlotPicker'
import { PartUnitActionRequestsTable } from '@/features/part-unit-actions/PartUnitActionRequestsTable'
import { useBranchStore } from '@/stores/branch-store'
import { useCanApprove, useHasRole } from '@/stores/use-has-role'
import type { ReplacementRequestStatus, ReplacementRequest } from '@/types/breakdown'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const replacementStatusLabels: Record<ReplacementRequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

/**
 * Plain "Setujui" when the equipment has at most one active installation of
 * this part — auto-resolved server-side, no need to ask. Once there's more
 * than one, tapping straight through the Setujui button would be ambiguous
 * (PartLifecycleService::resolveActiveInstallation() would 422), so this
 * shows the A/B/C picker instead and approves the moment one is tapped.
 */
function ApproveReplacementAction({
  request,
  onApprove,
  isPending,
}: {
  request: ReplacementRequest
  onApprove: (oldInstallationId?: number | null) => void
  isPending: boolean
}) {
  const { data: installations } = useQuery({
    queryKey: ['part-installations', request.equipment_id],
    queryFn: () => fetchPartInstallations(request.equipment_id),
  })

  const activeSamePart = (installations ?? []).filter(
    (installation) => installation.part_id === request.part_id && installation.is_active,
  )

  if (activeSamePart.length > 1) {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-[11px] text-muted-foreground">Pilih unit yang diganti:</p>
        <InstallationSlotPicker
          installations={activeSamePart}
          disabled={isPending}
          onSelect={(installation) => onApprove(installation.id)}
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
          <AlertDialogAction onClick={() => onApprove(null)}>Setujui</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ReplacementRequestsTable({ branchId, status }: { branchId: number; status: ReplacementRequestStatus }) {
  const queryClient = useQueryClient()
  const canApprove = useCanApprove()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['replacement-requests', branchId, status],
    queryFn: () => fetchReplacementRequests(branchId, status),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, oldInstallationId }: { id: number; oldInstallationId?: number | null }) =>
      approveReplacementRequest(id, undefined, oldInstallationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replacement-requests', branchId] })
      toast.success('Penggantian disetujui — part lama dilepas, stok otomatis berkurang.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyetujui permintaan.'
      toast.error(message)
      // If this failed because someone else already reviewed it, refresh so
      // the stale "pending" row doesn't invite another retry.
      queryClient.invalidateQueries({ queryKey: ['replacement-requests', branchId] })
    },
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (requests?.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={`Tidak ada permintaan ${replacementStatusLabels[status].toLowerCase()}`}
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part</TableHead>
          <TableHead>Lokasi</TableHead>
          <TableHead>Diajukan oleh</TableHead>
          <TableHead>Alasan</TableHead>
          <TableHead className="text-right">Jumlah</TableHead>
          {status !== 'pending' && <TableHead>Ditinjau oleh</TableHead>}
          {status === 'pending' && canApprove && <TableHead className="text-right">Aksi</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests?.map((req) => (
          <TableRow key={req.id}>
            <TableCell>
              <div className="font-medium">{req.part_name}</div>
              <div className="font-mono text-xs text-muted-foreground">{req.item_master_no}</div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {req.equipment_name}
              <div className="text-xs">
                {req.machine_name} · {req.line_name}
              </div>
            </TableCell>
            <TableCell>{req.requested_by_name}</TableCell>
            <TableCell className="max-w-[200px] truncate text-muted-foreground" title={req.reason ?? ''}>
              {req.reason ?? '-'}
            </TableCell>
            <TableCell className="text-right">{req.quantity_used}</TableCell>
            {status !== 'pending' && (
              <TableCell className="text-muted-foreground">
                {req.reviewed_by_name ?? '-'}
                {req.review_notes && <div className="text-xs italic">"{req.review_notes}"</div>}
              </TableCell>
            )}
            {status === 'pending' && canApprove && (
              <TableCell className="flex items-start justify-end gap-2">
                <ApproveReplacementAction
                  request={req}
                  isPending={approveMutation.isPending}
                  onApprove={(oldInstallationId) => approveMutation.mutate({ id: req.id, oldInstallationId })}
                />
                <RejectRequestDialog requestId={req.id} branchId={branchId} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Split off from Workspace into its own page/nav item — Engineer/Supervisor/
 * Superadmin can all view every board; only useCanApprove() (Supervisor/
 * Superadmin) actually gets the Setujui/Tolak controls. Admin Spare Part
 * never sees this at all (hidden from nav, and blocked here too in case of
 * a direct link).
 */
export function ApprovalPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canSeeApprovalBoard = useHasRole(['engineer', 'supervisor', 'superadmin'])

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
      <PageHeader title="Approval" />

      {!activeBranchId ? (
        <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
      ) : (
        <Tabs defaultValue="replacement">
          <TabsList>
            <TabsTrigger value="replacement">Penggantian (Breakdown)</TabsTrigger>
            <TabsTrigger value="unit-actions">Pasang/Lepas Unit</TabsTrigger>
          </TabsList>

          <TabsContent value="replacement" className="mt-4">
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">Menunggu</TabsTrigger>
                <TabsTrigger value="approved">Disetujui</TabsTrigger>
                <TabsTrigger value="rejected">Ditolak</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4">
                <ReplacementRequestsTable branchId={activeBranchId} status="pending" />
              </TabsContent>
              <TabsContent value="approved" className="mt-4">
                <ReplacementRequestsTable branchId={activeBranchId} status="approved" />
              </TabsContent>
              <TabsContent value="rejected" className="mt-4">
                <ReplacementRequestsTable branchId={activeBranchId} status="rejected" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="unit-actions" className="mt-4">
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">Menunggu</TabsTrigger>
                <TabsTrigger value="approved">Disetujui</TabsTrigger>
                <TabsTrigger value="rejected">Ditolak</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4">
                <PartUnitActionRequestsTable branchId={activeBranchId} status="pending" />
              </TabsContent>
              <TabsContent value="approved" className="mt-4">
                <PartUnitActionRequestsTable branchId={activeBranchId} status="approved" />
              </TabsContent>
              <TabsContent value="rejected" className="mt-4">
                <PartUnitActionRequestsTable branchId={activeBranchId} status="rejected" />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
