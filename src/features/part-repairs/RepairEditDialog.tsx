import { useEffect, useState } from 'react'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const dispositionLabels: Record<PartRepairDisposition, string> = {
  pending: 'Perlu Keputusan',
  in_repair: 'Proses Repair',
  repaired: 'Siap Dipasang',
  scrapped: 'Dibuang',
}

interface RepairEditDialogProps {
  repair: PartRepair | null
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: (data: {
    disposition: PartRepairDisposition
    estimated_completion_date: string | null
    repair_cost: number | null
    notes: string | null
  }) => void
}

/**
 * Superadmin-only "fix a mistake" dialog — unlike the card's normal
 * forward-only buttons, this lets the status be set to ANY column
 * (including backward, or un-scrapping) plus edit the ETA/notes directly.
 * The backend enforces the superadmin-only part of this
 * (PartRepairController::update() rejects a backward move from anyone
 * else), this dialog is just the one place that exposes it.
 */
export function RepairEditDialog({ repair, isSubmitting, onCancel, onConfirm }: RepairEditDialogProps) {
  const [disposition, setDisposition] = useState<PartRepairDisposition>('pending')
  const [date, setDate] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!repair) return
    setDisposition(repair.disposition)
    setDate(repair.estimated_completion_date ?? '')
    setCost(repair.repair_cost ?? '')
    setNotes(repair.notes ?? '')
  }, [repair])

  return (
    <Dialog open={!!repair} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Perbaikan</DialogTitle>
          <DialogDescription>
            {repair?.part_name} — Unit {repair?.unit_code}. Perbaiki status/data kalau ada kesalahan input.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select value={disposition} onValueChange={(v) => setDisposition(v as PartRepairDisposition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(dispositionLabels) as PartRepairDisposition[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {dispositionLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-repair-eta">Estimasi Selesai</Label>
          <Input id="edit-repair-eta" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-repair-cost">Biaya Repair</Label>
          <Input
            id="edit-repair-cost"
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-repair-notes">Catatan</Label>
          <Textarea id="edit-repair-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                disposition,
                estimated_completion_date: date || null,
                repair_cost: cost ? Number(cost) : null,
                notes: notes || null,
              })
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
