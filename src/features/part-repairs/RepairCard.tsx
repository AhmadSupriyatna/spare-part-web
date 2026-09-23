import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { PartUnitQrPrint } from '@/components/PartUnitQrPrint'
import { cn } from '@/lib/utils'
import type { PartRepair } from '@/types/relations'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

interface RepairCardProps {
  repair: PartRepair
  canManage: boolean
  isSuperadmin: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onRepair: () => void
  onReady: () => void
  onScrap: () => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * One removed unit as a card on the Repair Part board. Draggable to the
 * next column (Perlu Keputusan -> Proses Repair -> Siap Dipasang) when the
 * viewer can manage inventory; click/tap buttons cover the same actions for
 * everyone else (view-only roles just don't get the buttons or the drag).
 * Superadmin gets two extra corrections not offered to Admin Spare Part:
 * Edit (any status/ETA/notes, including a backward move) and Hapus (undoes
 * the removal entirely, for a part removed by mistake).
 */
export function RepairCard({
  repair,
  canManage,
  isSuperadmin,
  onDragStart,
  onDragEnd,
  onRepair,
  onReady,
  onScrap,
  onEdit,
  onDelete,
}: RepairCardProps) {
  return (
    <div
      draggable={canManage}
      onDragStart={(e) => {
        if (!canManage) return
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-background p-3',
        canManage && 'cursor-grab active:cursor-grabbing',
        repair.is_overdue && 'border-warning',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/part-units/${repair.part_unit_id}`} className="min-w-0 font-medium hover:underline">
          <span className="block truncate">{repair.part_name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {repair.percent_used != null && (
            <Badge variant={repair.percent_used >= 90 ? 'destructive' : 'secondary'}>
              {repair.percent_used}% · {repair.total_runtime_hours_used ?? 0} jam
            </Badge>
          )}
          {isSuperadmin && (
            <>
              <Button size="icon-sm" variant="ghost" title="Edit" aria-label="Edit" onClick={onEdit}>
                <Pencil />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button size="icon-sm" variant="ghost" title="Batalkan pelepasan" aria-label="Batalkan pelepasan">
                      <Trash2 />
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan pelepasan part ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{repair.part_name}" (Unit {repair.unit_code}) akan dikembalikan terpasang seperti semula, dan
                      catatan perbaikan ini dihapus. Pakai ini kalau part-nya salah dilepas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Batalkan Pelepasan</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Unit {repair.unit_code}
        {repair.equipment_name && (
          <>
            {' · terpasang terakhir di '}
            {repair.equipment_name} ({repair.machine_name} · {repair.line_name})
          </>
        )}
      </p>

      <p className="text-xs text-muted-foreground">
        Dilepas {new Date(repair.removed_at).toLocaleDateString('id-ID')}
        {repair.disposition === 'in_repair' && repair.estimated_completion_date && (
          <> · Estimasi selesai {new Date(repair.estimated_completion_date).toLocaleDateString('id-ID')}</>
        )}
        {repair.repair_cost != null && <> · Biaya repair {currencyFormatter.format(Number(repair.repair_cost))}</>}
      </p>

      {repair.is_overdue && (
        <div className="flex items-center gap-1.5 rounded-md bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          Melewati estimasi selesai — sudah diperbaiki?
        </div>
      )}

      {canManage && repair.disposition === 'pending' && (
        <div className="flex justify-end gap-2 border-t pt-2">
          <Button size="sm" variant="ghost" onClick={onScrap}>
            Scrap
          </Button>
          <Button size="sm" onClick={onRepair}>
            Repair
          </Button>
        </div>
      )}
      {canManage && repair.disposition === 'in_repair' && (
        <div className="flex justify-end gap-2 border-t pt-2">
          <Button size="sm" variant={repair.is_overdue ? 'destructive' : 'ghost'} onClick={onScrap}>
            Gagal · Scrap
          </Button>
          <Button size="sm" onClick={onReady}>
            Selesai
          </Button>
        </div>
      )}
      {repair.disposition === 'repaired' && (
        <div className="flex justify-end border-t pt-2">
          <PartUnitQrPrint
            unitId={repair.part_unit_id}
            partName={repair.part_name}
            itemMasterNo={repair.item_master_no}
            unitCode={repair.unit_code}
            label="Cetak QR"
          />
        </div>
      )}
    </div>
  )
}
