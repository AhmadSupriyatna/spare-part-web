import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { fetchSuppliers } from '@/features/suppliers/api'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Read-only reference list for the Inventory Workspace's "Supplier" tab —
 * no add/edit/delete here (that's still the standalone /suppliers page).
 * Assigning a supplier to a specific part happens in the Workspace tab
 * itself now (AssignPartSupplierSheet), not here.
 */
export function SupplierReadOnlyList({ branchId }: { branchId: number }) {
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => fetchSuppliers(branchId),
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

  if (!suppliers || suppliers.length === 0) {
    return <EmptyState icon={Truck} title="Belum ada supplier" description="Belum ada supplier terdaftar di plant ini." />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Kontak</TableHead>
          <TableHead>Telepon</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell className="text-muted-foreground">{supplier.contact_person ?? '-'}</TableCell>
            <TableCell className="text-muted-foreground">{supplier.phone ?? '-'}</TableCell>
            <TableCell className="text-muted-foreground">{supplier.email ?? '-'}</TableCell>
            <TableCell className="text-muted-foreground">{supplier.is_active ? 'Aktif' : 'Nonaktif'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
