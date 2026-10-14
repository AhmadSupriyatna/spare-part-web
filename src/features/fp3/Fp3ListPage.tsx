import { useQuery } from '@tanstack/react-query'
import { FileWarning, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchFp3RequestsForBranch, type Fp3Request } from '@/features/fp3/api'
import { useBranchStore } from '@/stores/branch-store'
import { EmptyState } from '@/components/EmptyState'
import { QueryErrorState } from '@/components/QueryErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'
const currentMonth = new Date().toISOString().slice(0, 7)
const statusOptions: (Fp3Request['status'] | typeof ALL)[] = [
  ALL,
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]

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

export function Fp3ListPage({ showPageHeader = true }: { showPageHeader?: boolean }) {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [statusFilter, setStatusFilter] = useState<Fp3Request['status'] | 'all'>(ALL)
  const [periodType, setPeriodType] = useState<'all' | 'month' | 'range'>('all')
  const [month, setMonth] = useState(currentMonth)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: requests, isLoading, isError, refetch } = useQuery({
    queryKey: ['fp3-requests', activeBranchId],
    queryFn: () => fetchFp3RequestsForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const filtered = useMemo(() => {
    return [...(requests ?? [])]
      .filter((request) => {
        if (statusFilter !== ALL && request.status !== statusFilter) return false
        const createdDate = request.created_at.slice(0, 10)
        if (periodType === 'month' && createdDate.slice(0, 7) !== month) return false
        if (periodType === 'range' && dateFrom && createdDate < dateFrom) return false
        if (periodType === 'range' && dateTo && createdDate > dateTo) return false
        return true
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [dateFrom, dateTo, month, periodType, requests, statusFilter])

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {showPageHeader && <PageHeader title="FP3" description="Semua permintaan FP3 di plant ini. Klaim dan laporan dikerjakan lewat Workspace." />}

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp3-period">Periode</Label>
            <Select value={periodType} onValueChange={(value) => setPeriodType(value as typeof periodType)}>
              <SelectTrigger id="fp3-period" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="month">Bulan & Tahun</SelectItem>
                <SelectItem value="range">Rentang Tanggal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodType === 'month' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="fp3-month">Bulan & Tahun</Label>
              <Input
                id="fp3-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="w-48"
              />
            </div>
          )}
          {periodType === 'range' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fp3-date-from">Dari Tanggal</Label>
                <Input
                  id="fp3-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-48"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fp3-date-to">Sampai Tanggal</Label>
                <Input
                  id="fp3-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-48"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Filter status FP3">
            {statusOptions.map((status) => {
              const label = status === ALL ? 'Semua' : statusLabels[status]
              return (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? 'default' : 'ghost'}
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                >
                  {label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} title="Gagal memuat daftar FP3" />
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
