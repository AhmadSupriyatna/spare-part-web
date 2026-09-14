import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { completeTask } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import type { Task } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CompleteTaskDialogProps {
  task: Task
  invalidateKey: unknown[]
}

export function CompleteTaskDialog({ task, invalidateKey }: CompleteTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [partStockId, setPartStockId] = useState(task.part_stock_id ? String(task.part_stock_id) : '')
  const [quantityUsed, setQuantityUsed] = useState(task.quantity_used ? String(task.quantity_used) : '')
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const queryClient = useQueryClient()

  const { data: partStocks } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: open && !!activeBranchId,
  })

  const mutation = useMutation({
    mutationFn: () =>
      completeTask(task.id, {
        notes: notes || undefined,
        part_stock_id: partStockId ? Number(partStockId) : null,
        quantity_used: quantityUsed ? Number(quantityUsed) : null,
      }),
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
            <Label>Part yang Dipakai (opsional)</Label>
            <Select value={partStockId} onValueChange={(value) => setPartStockId(value ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih part" />
              </SelectTrigger>
              <SelectContent>
                {partStocks?.map((stock) => (
                  <SelectItem key={stock.id} value={String(stock.id)}>
                    {stock.part_name ?? `Part #${stock.part_id}`} — stok {stock.quantity_on_hand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {task.part_stock_id && (
              <p className="text-xs text-muted-foreground">
                Rencana dari jadwal: {task.part_name ?? `Part #${task.part_stock_id}`}
                {task.quantity_used ? ` × ${task.quantity_used}` : ''}. Ubah di atas kalau beda dari aktualnya.
              </p>
            )}
          </div>
          {partStockId && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity_used">Jumlah Dipakai</Label>
              <Input
                id="quantity_used"
                type="number"
                min={1}
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(e.target.value)}
              />
            </div>
          )}
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
