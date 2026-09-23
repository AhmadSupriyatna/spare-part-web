import { useEffect, useState } from 'react'
import type { PartRepair } from '@/types/relations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RepairCompleteDialogProps {
  repair: PartRepair | null
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: (repairCost: number | null) => void
}

/**
 * Prompted when a "Proses Repair" card moves to "Siap Dipasang" (the "Selesai"
 * button, or dragging the card over) — the one piece of history worth
 * capturing at that moment: how much this repair actually cost. Optional
 * (a unit can be marked repaired without a cost on file), never feeds into
 * any budget/lifetime formula — it's just a physical-part cost record.
 */
export function RepairCompleteDialog({ repair, isSubmitting, onCancel, onConfirm }: RepairCompleteDialogProps) {
  const [cost, setCost] = useState('')

  useEffect(() => {
    if (repair) setCost(repair.repair_cost ?? '')
  }, [repair])

  return (
    <Dialog open={!!repair} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Selesaikan Perbaikan</DialogTitle>
          <DialogDescription>
            {repair?.part_name} — Unit {repair?.unit_code}. Unit ini akan siap dipasang kembali.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repair-cost">Biaya Repair (opsional)</Label>
          <Input
            id="repair-cost"
            type="number"
            min={0}
            step="0.01"
            placeholder="Misal: 150000"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button onClick={() => onConfirm(cost ? Number(cost) : null)} disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Selesai'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
