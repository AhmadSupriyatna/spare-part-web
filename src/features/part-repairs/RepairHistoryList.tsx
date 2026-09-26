import { History, Pencil, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'
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
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const dispositionLabels: Record<PartRepairDisposition, string> = {
  pending: 'Perlu Keputusan',
  in_repair: 'Proses Repair',
  repaired: 'Siap Dipasang',
  scrapped: 'Dibuang',
}

const dispositionVariants: Record<PartRepairDisposition, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  pending: 'secondary',
  in_repair: 'warning',
  repaired: 'success',
  scrapped: 'destructive',
}

interface RepairHistoryListProps {
  repairs: PartRepair[] | undefined
  isLoading: boolean
  isSuperadmin: boolean
  onEdit: (repair: PartRepair) => void
  onDelete: (repair: PartRepair) => void
}

/**
 * Riwayat Perbaikan — every part ever pulled off equipment in this branch,
 * regardless of current disposition (the kanban above only shows the
 * still-open ones). Merges what used to be a separate "Maintenance History"
 * tab AND the separate "Dibuang" scrapped list (same underlying PartRepair
 * data shown twice) into this one table: part, where/when removed, when
 * scrapped/repaired, repair cost, current status, by whom, and — Superadmin
 * only — the same Edit/"Batalkan pelepasan" corrections the scrapped list
 * used to offer.
 */
export function RepairHistoryList({ repairs, isLoading, isSuperadmin, onEdit, onDelete }: RepairHistoryListProps) {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!repairs || repairs.length === 0) {
    return <EmptyState icon={History} title="Belum ada riwayat" description="Belum ada part yang pernah dilepas di plant ini." />
  }

  const allSelected = repairs.length > 0 && repairs.every((r) => selectedIds.has(r.id))

  function toggleAll() {
    if (!repairs) return
    setSelectedIds(allSelected ? new Set() : new Set(repairs.map((r) => r.id)))
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function printSelected() {
    const selected = repairs?.filter((r) => selectedIds.has(r.id)) ?? []
    navigate('/pm/repairs/print', { state: { repairs: selected } })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Riwayat Perbaikan</h2>
        <Button size="sm" disabled={selectedIds.size === 0} onClick={printSelected}>
          <Printer className="size-3.5" />
          Cetak Terpilih ({selectedIds.size})
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" />
              </TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Dilepas Dari</TableHead>
              <TableHead>Dilepas</TableHead>
              <TableHead>Diperbaiki</TableHead>
              <TableHead>Biaya Perbaikan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Oleh</TableHead>
              {isSuperadmin && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairs.map((repair) => (
              <TableRow key={repair.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(repair.id)}
                    onCheckedChange={() => toggleOne(repair.id)}
                    aria-label={`Pilih ${repair.part_name ?? 'part'}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {repair.part_name ?? '-'}
                  <div className="font-mono text-xs text-muted-foreground">{repair.item_master_no}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {repair.equipment_name ?? '-'}
                  <div className="text-xs">
                    {repair.machine_name} · {repair.line_name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(repair.removed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {repair.repaired_at ? new Date(repair.repaired_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">{repair.repair_cost ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={dispositionVariants[repair.disposition]}>{dispositionLabels[repair.disposition]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{repair.removed_by_name ?? '-'}</TableCell>
                {isSuperadmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" title="Edit" aria-label="Edit" onClick={() => onEdit(repair)}>
                        <Pencil />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Batalkan pelepasan"
                              aria-label="Batalkan pelepasan"
                            >
                              <Trash2 />
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Batalkan pelepasan part ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{repair.part_name}" (Unit {repair.unit_code}) akan dikembalikan terpasang seperti
                              semula, dan catatan perbaikan ini dihapus. Pakai ini kalau part-nya salah dibuang.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(repair)}>Batalkan Pelepasan</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
