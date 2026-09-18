import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
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
import { Button } from '@/components/ui/button'

interface RepairScrapListProps {
  repairs: PartRepair[]
  isSuperadmin: boolean
  onEdit: (repair: PartRepair) => void
  onDelete: (repair: PartRepair) => void
}

/**
 * Scrapped units aren't a 4th board column (they're a dead end, not
 * something anyone moves forward) — just a flat list underneath so they're
 * still visible without cluttering the 3 active columns.
 */
export function RepairScrapList({ repairs, isSuperadmin, onEdit, onDelete }: RepairScrapListProps) {
  if (repairs.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">Dibuang ({repairs.length})</h3>
      <div className="flex flex-col divide-y rounded-lg border">
        {repairs.map((repair) => (
          <div key={repair.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <Link to={`/part-units/${repair.part_unit_id}`} className="font-medium hover:underline">
                {repair.part_name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                Unit {repair.unit_code}
                {repair.equipment_name && (
                  <>
                    {' · terakhir di '}
                    {repair.equipment_name} ({repair.machine_name} · {repair.line_name})
                  </>
                )}
                {repair.notes && <> · {repair.notes}</>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(repair.removed_at).toLocaleDateString('id-ID')}
              </span>
              {isSuperadmin && (
                <>
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
                          "{repair.part_name}" (Unit {repair.unit_code}) akan dikembalikan terpasang seperti semula,
                          dan catatan perbaikan ini dihapus. Pakai ini kalau part-nya salah dibuang.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(repair)}>Batalkan Pelepasan</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
