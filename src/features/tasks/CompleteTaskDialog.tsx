import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { completeTask } from '@/features/tasks/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CompleteTaskDialogProps {
  taskId: number
  invalidateKey: unknown[]
}

export function CompleteTaskDialog({ taskId, invalidateKey }: CompleteTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => completeTask(taskId, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('Tugas berhasil diselesaikan.')
      setNotes('')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyelesaikan tugas.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Selesai</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selesaikan Tugas</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="complete-notes">Catatan (opsional)</Label>
            <Textarea
              id="complete-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Apa yang dikerjakan/ditemukan"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Tandai Selesai'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
