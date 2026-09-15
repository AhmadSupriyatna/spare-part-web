import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router'
import { approvePartUnitActionRequest, fetchPartUnitActionRequests } from '@/features/part-unit-actions/api'
import { RejectPartUnitActionDialog } from '@/features/part-unit-actions/RejectPartUnitActionDialog'
import type { PartUnitActionRequestStatus } from '@/types/part-unit-actions'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<PartUnitActionRequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

const actionLabels = {
  remove: 'Lepas',
  reinstall: 'Pasang',
} as const

export function PartUnitActionRequestsTable({
  branchId,
  status,
}: {
  branchId: number
  status: PartUnitActionRequestStatus
}) {
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['part-unit-action-requests', branchId, status],
    queryFn: () => fetchPartUnitActionRequests(branchId, status),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePartUnitActionRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-unit-action-requests', branchId] })
      toast.success('Disetujui — status unit diperbarui.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyetujui permintaan.'
      toast.error(message)
      queryClient.invalidateQueries({ queryKey: ['part-unit-action-requests', branchId] })
    },
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (requests?.length === 0) {
    return <EmptyState icon={Inbox} title={`Tidak ada permintaan ${statusLabels[status].toLowerCase()}`} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Aksi</TableHead>
          <TableHead>Equipment / Lokasi</TableHead>
          <TableHead>Diajukan oleh</TableHead>
          <TableHead>Catatan</TableHead>
          {status !== 'pending' && <TableHead>Ditinjau oleh</TableHead>}
          {status === 'pending' && <TableHead className="text-right">Aksi</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests?.map((req) => (
          <TableRow key={req.id}>
            <TableCell>
              <Link to={`/part-units/${req.part_unit_id}`} className="font-medium hover:underline">
                Unit {req.unit_code}
              </Link>
              <div className="text-xs text-muted-foreground">{req.part_name}</div>
            </TableCell>
            <TableCell>
              <Badge variant={req.action === 'remove' ? 'warning' : 'success'}>
                {actionLabels[req.action]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {req.equipment_name}
              <div className="text-xs">
                {req.machine_name} · {req.line_name}
              </div>
            </TableCell>
            <TableCell>{req.requested_by_name}</TableCell>
            <TableCell className="max-w-[200px] truncate text-muted-foreground" title={req.notes ?? ''}>
              {req.notes ?? '-'}
            </TableCell>
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
                <RejectPartUnitActionDialog requestId={req.id} branchId={branchId} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
