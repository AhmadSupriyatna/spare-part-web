import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ClipboardCheck, Inbox, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { approveReplacementRequest, fetchReplacementRequests } from '@/features/breakdown/api'
import { RejectRequestDialog } from '@/features/breakdown/RejectRequestDialog'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { InstallationSlotPicker } from '@/features/part-installations/InstallationSlotPicker'
import { fetchPartUnitActionRequests } from '@/features/part-unit-actions/api'
import { PartUnitActionRequestsTable } from '@/features/part-unit-actions/PartUnitActionRequestsTable'
import { fetchMyTasks } from '@/features/tasks/api'
import { WoCard } from '@/features/workspace/WoCard'
import { useBranchStore } from '@/stores/branch-store'
import { useCanApprove, useHasRole } from '@/stores/use-has-role'
import type { ReplacementRequestStatus, ReplacementRequest } from '@/types/breakdown'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <Button size="sm" onClick={() => onApprove(null)} disabled={isPending}>
      Setujui
    </Button>
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
 * The Approval tab's content — moved here from the old standalone
 * BreakdownApprovalBoardPage. Anyone who can see this tab (Engineer/
 * Supervisor/Superadmin) can view every board; only useCanApprove()
 * (Supervisor/Superadmin) actually gets the Setujui/Tolak controls.
 */
function ApprovalBoard({ branchId }: { branchId: number }) {
  return (
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
            <ReplacementRequestsTable branchId={branchId} status="pending" />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <ReplacementRequestsTable branchId={branchId} status="approved" />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <ReplacementRequestsTable branchId={branchId} status="rejected" />
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
            <PartUnitActionRequestsTable branchId={branchId} status="pending" />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <PartUnitActionRequestsTable branchId={branchId} status="approved" />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <PartUnitActionRequestsTable branchId={branchId} status="rejected" />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  )
}

/**
 * The Tugas view — a shared WO pool rather than a per-person inbox: a WO
 * stays unclaimed (assigned_to null) until an Engineer or Supervisor acts
 * on it, which is also the moment TaskController::ensureCanWork() claims
 * it for them. Shows every not-yet-worked WO regardless of due date — a
 * week window was tried here and dropped as redundant with the Maintenance
 * calendar, which already handles date-based browsing; this view is purely
 * "what's outstanding," sorted nearest-due-first (from the API).
 */
function TaskPoolView({ branchId }: { branchId: number }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'mine', branchId],
    queryFn: () => fetchMyTasks(branchId),
  })

  const [search, setSearch] = useState('')

  const openTasks = useMemo(
    () => (tasks ?? []).filter((task) => task.status === 'pending' || task.status === 'in_progress'),
    [tasks],
  )

  // Progress reflects the whole pool (every claimed-or-claimable task, not
  // just what's currently open) — cancelled ones don't count either way,
  // they were never going to be "done."
  const relevantTasks = useMemo(() => (tasks ?? []).filter((task) => task.status !== 'cancelled'), [tasks])
  const doneCount = relevantTasks.filter((task) => task.status === 'completed').length
  const totalCount = relevantTasks.length
  const remainingCount = totalCount - doneCount
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return openTasks
    return openTasks.filter((task) =>
      [task.title, task.equipment_name, task.machine_name, task.line_name, ...(task.part_checks ?? []).map((c) => c.part_name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [openTasks, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{remainingCount} WO tersisa</span>
        <span>
          {doneCount}/{totalCount} selesai
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari WO, equipment, atau part..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={search ? 'Tidak ada WO yang cocok' : 'Tidak ada WO yang belum dikerjakan'}
          description="WO baru (dari Task Library, Part Lifetime, atau Breakdown) akan muncul di sini begitu dijadwalkan."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleTasks.map((task) => (
            <WoCard key={task.id} task={task} invalidateKey={['tasks', 'mine', branchId]} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * "Tugas Saya" grew into this: a shared work pool for Engineer/Supervisor
 * (a WO belongs to whoever claims it, not to one person from the start —
 * see TaskController::mine()/ensureCanWork()) plus the approval boards
 * that used to live on their own page. Admin Spare Part has no read or
 * write access to either half, so it never sees this nav item at all (see
 * AppLayout's `roles` filter); Engineer can see the Approval board but
 * only Supervisor/Superadmin get the Setujui/Tolak controls inside it.
 * The two views are no longer a two-way tab strip — Approval is a single
 * top-right button (badged with the pending count) since it's the
 * secondary, occasional view; a back button returns to the WO pool.
 */
export function WorkspacePage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canSeeApprovalBoard = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const [view, setView] = useState<'tasks' | 'approval'>('tasks')

  const { data: pendingReplacements } = useQuery({
    queryKey: ['replacement-requests', activeBranchId, 'pending'],
    queryFn: () => fetchReplacementRequests(activeBranchId!, 'pending'),
    enabled: !!activeBranchId && canSeeApprovalBoard,
  })
  const { data: pendingUnitActions } = useQuery({
    queryKey: ['part-unit-action-requests', activeBranchId, 'pending'],
    queryFn: () => fetchPartUnitActionRequests(activeBranchId!, 'pending'),
    enabled: !!activeBranchId && canSeeApprovalBoard,
  })
  const pendingApprovalCount = (pendingReplacements?.length ?? 0) + (pendingUnitActions?.length ?? 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Workspace" />
        {canSeeApprovalBoard && view === 'tasks' && (
          <Button variant="outline" size="sm" className="relative shrink-0" onClick={() => setView('approval')}>
            <ShieldCheck className="size-3.5" />
            Approval
            {pendingApprovalCount > 0 && (
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                {pendingApprovalCount}
              </span>
            )}
          </Button>
        )}
        {view === 'approval' && (
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setView('tasks')}>
            <ChevronLeft className="size-3.5" />
            Kembali ke Tugas
          </Button>
        )}
      </div>

      {!activeBranchId ? (
        <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
      ) : view === 'tasks' ? (
        <TaskPoolView branchId={activeBranchId} />
      ) : (
        <ApprovalBoard branchId={activeBranchId} />
      )}
    </div>
  )
}
