import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { approveReplacementRequest, fetchReplacementRequests } from '@/features/breakdown/api'
import { RejectRequestDialog } from '@/features/breakdown/RejectRequestDialog'
import { useBranchStore } from '@/stores/branch-store'
import type { ReplacementRequestStatus } from '@/types/breakdown'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<ReplacementRequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

function RequestsTable({ branchId, status }: { branchId: number; status: ReplacementRequestStatus }) {
  const queryClient = useQueryClient()

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
        title={`Tidak ada permintaan ${statusLabels[status].toLowerCase()}`}
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
          {status === 'pending' && <TableHead className="text-right">Aksi</TableHead>}
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
            {status === 'pending' && (
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

export function BreakdownApprovalBoardPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Papan Kerja Approval Penggantian"
        description="Permintaan penggantian part dari lapangan (scan QR breakdown) menunggu keputusan di sini."
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <RequestsTable branchId={activeBranchId} status="pending" />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <RequestsTable branchId={activeBranchId} status="approved" />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <RequestsTable branchId={activeBranchId} status="rejected" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
