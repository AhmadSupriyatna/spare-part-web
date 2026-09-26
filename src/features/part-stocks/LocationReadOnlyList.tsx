import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { fetchLocations } from '@/features/locations/api'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Read-only reference list for the Inventory Workspace's "Lokasi" tab — no
 * drag-and-drop assignment or rack/level management here (that's still the
 * standalone /locations page). Assigning a location to a specific part
 * happens in the Workspace tab itself now (SetPartLocationDialog), not here.
 */
export function LocationReadOnlyList({ branchId }: { branchId: number }) {
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', branchId],
    queryFn: () => fetchLocations(branchId),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!locations || locations.length === 0) {
    return <EmptyState icon={MapPin} title="Belum ada lokasi" description="Belum ada lokasi terdaftar di plant ini." />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kode</TableHead>
          <TableHead>Deskripsi</TableHead>
          <TableHead className="text-right">Jumlah Part</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((location) => (
          <TableRow key={location.id}>
            <TableCell className="font-mono font-medium">{location.code}</TableCell>
            <TableCell className="text-muted-foreground">{location.description ?? '-'}</TableCell>
            <TableCell className="text-right tabular-nums">{location.part_stocks_count ?? 0}</TableCell>
            <TableCell>
              {location.is_active ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
