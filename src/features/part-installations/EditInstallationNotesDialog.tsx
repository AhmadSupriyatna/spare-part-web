import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { updatePartInstallation } from '@/features/part-installations/api'
import type { PartInstallation } from '@/types/relations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EditInstallationNotesDialogProps {
  installation: PartInstallation
  equipmentId: number
  trigger: React.ReactNode
}

export function EditInstallationNotesDialog({ installation, equipmentId, trigger }: EditInstallationNotesDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(installation.notes ?? '')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => updatePartInstallation(installation.id, notes || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success('Catatan berhasil diperbarui.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal memperbarui catatan.'),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setNotes(installation.notes ?? '')
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Catatan — {installation.part_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-notes">Deskripsi</Label>
          <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
