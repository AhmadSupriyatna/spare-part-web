import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ClipboardCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { approveReplacementRequest, fetchReplacementRequests } from '@/features/breakdown/api'
import { RejectRequestDialog } from '@/features/breakdown/RejectRequestDialog'
import { PartUnitActionRequestsTable } from '@/features/part-unit-actions/PartUnitActionRequestsTable'
import { fetchMyTasks } from '@/features/tasks/api'
import { TaskRow } from '@/features/tasks/TaskRow'
import { useBranchStore } from '@/stores/branch-store'
import { useCanApprove, useHasRole } from '@/stores/use-has-role'
import { mondayOf, toDateKey } from '@/lib/dates'
import type { ReplacementRequestStatus } from '@/types/breakdown'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const replacementStatusLabels: Record<ReplacementRequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

function ReplacementRequestsTable({ branchId, status }: { branchId: number; status: ReplacementRequestStatus }) {
  const queryClient = useQueryClient()
  const canApprove = useCanApprove()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['replacement-requests', branchId, status],
    queryFn: () => fetchReplacementRequests(branchId, status),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveReplacementRequest(id),
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
              <TableCell className="flex justify-end gap-2">
                <Button size="sm" onClick={() => approveMutation.mutate(req.id)} disabled={approveMutation.isPending}>
                  Setujui
                </Button>
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
 * The Tugas tab — a shared WO pool rather than a per-person inbox: a WO
 * stays unclaimed (assigned_to null) until an Engineer or Supervisor
 * presses Mulai on it, which is also the moment TaskController::
 * ensureCanWork() claims it for them. fetchMyTasks() already returns
 * "mine + unclaimed" for those roles (see TaskController::mine()), so this
 * component doesn't need to know about claiming itself.
 */
function TaskPoolTab() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'mine', activeBranchId],
    queryFn: () => fetchMyTasks(activeBranchId),
    enabled: !!activeBranchId,
  })

  const [thisWeekOnly, setThisWeekOnly] = useState(false)

  const visibleTasks = useMemo(() => {
    if (!tasks) return []
    if (!thisWeekOnly) return tasks

    const weekStart = mondayOf(new Date())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startKey = toDateKey(weekStart)
    const endKey = toDateKey(weekEnd)

    return tasks.filter((task) => {
      if (!task.due_date) return false
      const key = toDateKey(new Date(task.due_date))
      return key >= startKey && key <= endKey
    })
  }, [tasks, thisWeekOnly])

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant={thisWeekOnly ? 'default' : 'outline'}
        size="sm"
        className="self-start"
        onClick={() => setThisWeekOnly((prev) => !prev)}
      >
        <CalendarDays className="size-3.5" />
        Minggu Ini
      </Button>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={thisWeekOnly ? 'Tidak ada WO minggu ini' : 'Tidak ada tugas yang bisa dikerjakan saat ini'}
          description="WO baru (dari Task Library, Part Lifetime, atau Breakdown) akan muncul di sini begitu dijadwalkan, diurutkan dari yang jatuh tempo terdekat."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Diklaim oleh</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTasks.map((task) => (
              <TaskRow key={task.id} task={task} invalidateKey={['tasks', 'mine', activeBranchId]} />
            ))}
          </TableBody>
        </Table>
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
 * AppLayout's `roles` filter); Engineer can see the Approval tab but only
 * Supervisor/Superadmin get the Setujui/Tolak controls inside it.
 */
export function WorkspacePage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canSeeApprovalBoard = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'approval' && canSeeApprovalBoard ? 'approval' : 'tasks'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Workspace" />

      <Tabs value={tab} onValueChange={(value) => setSearchParams(value === 'tasks' ? {} : { tab: value })}>
        <TabsList>
          <TabsTrigger value="tasks">Tugas</TabsTrigger>
          {canSeeApprovalBoard && <TabsTrigger value="approval">Approval</TabsTrigger>}
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TaskPoolTab />
        </TabsContent>

        {canSeeApprovalBoard && (
          <TabsContent value="approval" className="mt-4">
            {activeBranchId ? (
              <ApprovalBoard branchId={activeBranchId} />
            ) : (
              <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
