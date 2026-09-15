import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { createPartRepair } from '@/features/part-repairs/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SendToRepairDialogProps {
  partUnitId: number
  partInstallationId: number
  invalidateKeys: unknown[][]
  trigger: React.ReactNode
}

export function SendToRepairDialog({
  partUnitId,
  partInstallationId,
  invalidateKeys,
  trigger,
}: SendToRepairDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      createPartRepair(partUnitId, {
        part_installation_id: partInstallationId,
        notes: notes || null,
      }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success('Unit dikirim ke perbaikan.')
      setOpen(false)
      setNotes('')
    },
    onError: () => toast.error('Gagal membuka catatan perbaikan.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kirim ke Perbaikan</DialogTitle>
          <DialogDescription>
            Unit ini akan ditandai sedang menunggu keputusan perbaikan. Ubah statusnya lebih lanjut
            (sedang diperbaiki / selesai / dibuang) dari halaman Perbaikan Part.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repair-notes">Catatan (opsional)</Label>
          <Textarea
            id="repair-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misal: kondisi kerusakan yang ditemukan"
          />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Kirim ke Perbaikan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
