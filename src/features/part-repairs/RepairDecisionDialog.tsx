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

interface RepairDecisionDialogProps {
  repair: PartRepair | null
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: (estimatedCompletionDate: string) => void
}

/**
 * Prompted the moment a "Perlu Keputusan" card is sent into repair (drag
 * onto the Proses Repair column, or the card's Repair button) — the one
 * piece of information that decision needs: when it's expected back.
 */
export function RepairDecisionDialog({ repair, isSubmitting, onCancel, onConfirm }: RepairDecisionDialogProps) {
  const [date, setDate] = useState('')

  useEffect(() => {
    if (repair) setDate('')
  }, [repair])

  return (
    <Dialog open={!!repair} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mulai Perbaikan</DialogTitle>
          <DialogDescription>
            {repair?.part_name} — Unit {repair?.unit_code}. Masukkan estimasi tanggal selesai perbaikan.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repair-eta">Estimasi Selesai</Label>
          <Input id="repair-eta" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button onClick={() => onConfirm(date)} disabled={isSubmitting || !date}>
            {isSubmitting ? 'Menyimpan...' : 'Mulai Perbaikan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
