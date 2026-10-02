import { useEffect, useState } from 'react'
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
} from '@/components/ui/alert-dialog'
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

const dispositionRank: Record<PartRepairDisposition, number> = {
  pending: 0,
  in_repair: 1,
  repaired: 2,
  scrapped: 3,
}

/** Mirrors PartRepairDisposition::isBackwardFrom() server-side — Scrapped is terminal, so leaving it is always a "backward"/correction move regardless of rank. */
function isBackwardMove(from: PartRepairDisposition, to: PartRepairDisposition): boolean {
  if (to === from) return false
  if (from === 'scrapped') return true
  return dispositionRank[to] < dispositionRank[from]
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
 * else); picking a backward disposition here additionally raises an
 * AlertDialog confirmation before submitting, since this is a correction
 * for a mistaken click, not a normal day-to-day action.
 */
export function RepairEditDialog({ repair, isSubmitting, onCancel, onConfirm }: RepairEditDialogProps) {
  const [disposition, setDisposition] = useState<PartRepairDisposition>('pending')
  const [date, setDate] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmingBackwardMove, setConfirmingBackwardMove] = useState(false)

  useEffect(() => {
    if (!repair) return
    setDisposition(repair.disposition)
    setDate(repair.estimated_completion_date ?? '')
    setCost(repair.repair_cost ?? '')
    setNotes(repair.notes ?? '')
  }, [repair])

  function submit() {
    onConfirm({
      disposition,
      estimated_completion_date: date || null,
      repair_cost: cost ? Number(cost) : null,
      notes: notes || null,
    })
  }

  function handleSaveClick() {
    if (repair && isBackwardMove(repair.disposition, disposition)) {
      setConfirmingBackwardMove(true)
      return
    }
    submit()
  }

  return (
    <>
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
            <Button onClick={handleSaveClick} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingBackwardMove} onOpenChange={setConfirmingBackwardMove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin kembalikan status perbaikan?</AlertDialogTitle>
            <AlertDialogDescription>
              Status "{repair && dispositionLabels[repair.disposition]}" akan diubah mundur ke "
              {dispositionLabels[disposition]}" untuk "{repair?.part_name}" (Unit {repair?.unit_code}). Pastikan ini
              memang koreksi yang disengaja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingBackwardMove(false)
                submit()
              }}
            >
              Ya, Kembalikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
