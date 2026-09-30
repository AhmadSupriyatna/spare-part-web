import { useQuery } from '@tanstack/react-query'
import { FileWarning, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchFp3RequestsForBranch, type Fp3Request } from '@/features/fp3/api'
import { useBranchStore } from '@/stores/branch-store'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'

const statusLabels: Record<Fp3Request['status'], string> = {
  pending: 'Belum Diterima',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const statusBadgeVariants: Record<Fp3Request['status'], 'warning' | 'outline' | 'success' | 'secondary'> = {
  pending: 'warning',
  in_progress: 'outline',
  completed: 'success',
  cancelled: 'secondary',
}

const dispositionLabels: Record<NonNullable<Fp3Request['disposition']>, string> = {
  open: 'Open',
  closed: 'Closed',
  closed_with_note: 'Closed with Note',
}

/**
 * Riwayat FP3 — every request for this branch regardless of status, for
 * oversight (Workspace's own FP3 tab only shows what's still open). Claiming
 * and reporting happen from Workspace; this page is read-only.
 */
export function Fp3ListPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [statusFilter, setStatusFilter] = useState<Fp3Request['status'] | 'all'>(ALL)

  const { data: requests, isLoading } = useQuery({
    queryKey: ['fp3-requests', activeBranchId],
    queryFn: () => fetchFp3RequestsForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const filtered = useMemo(() => {
    if (statusFilter === ALL) return requests ?? []
    return (requests ?? []).filter((r) => r.status === statusFilter)
  }, [requests, statusFilter])

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Riwayat FP3"
        description="Semua Formulir Permintaan Perbaikan dan Pembuatan di plant ini. Klaim dan laporan dikerjakan lewat Workspace."
      />

      <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as typeof statusFilter) ?? ALL)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua Status</SelectItem>
          {Object.entries(statusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileWarning} title="Tidak ada FP3 pada filter ini" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Pengaju</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Diterima Oleh</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Disposisi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-xs">{request.code}</TableCell>
                <TableCell>
                  <div className="font-medium">{request.requester_name}</div>
                  <div className="text-xs text-muted-foreground">{request.department}</div>
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-muted-foreground" title={request.description}>
                  {request.description}
                </TableCell>
                <TableCell className="text-muted-foreground">{request.received_by_name ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariants[request.status]}>{statusLabels[request.status]}</Badge>
                </TableCell>
                <TableCell>
                  {request.disposition ? (
                    <Badge variant="outline">{dispositionLabels[request.disposition]}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString('id-ID')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Cetak FP3"
                    title="Cetak FP3"
                    render={<Link to={`/fp3/${request.id}/print`} />}
                  >
                    <Printer />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
