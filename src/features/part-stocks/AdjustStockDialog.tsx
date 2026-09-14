import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { adjustStock } from '@/features/part-stocks/api'
import { adjustStockSchema, type AdjustStockFormValues } from '@/features/part-stocks/schema'
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
import { Textarea } from '@/components/ui/textarea'

interface AdjustStockDialogProps {
  partStockId: number
  branchId: number
  trigger?: React.ReactNode
}

export function AdjustStockDialog({ partStockId, branchId, trigger }: AdjustStockDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
  })

  const mutation = useMutation({
    mutationFn: (values: AdjustStockFormValues) =>
      adjustStock(partStockId, {
        quantity_change: Number(values.quantity_change),
        reason: values.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-stock', partStockId] })
      queryClient.invalidateQueries({ queryKey: ['part-stock-ledger', partStockId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Stok berhasil disesuaikan.')
      reset()
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyesuaikan stok.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(trigger ?? <Button variant="outline">Sesuaikan Stok</Button>) as React.ReactElement}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity_change">Jumlah Perubahan</Label>
            <Input
              id="quantity_change"
              type="number"
              placeholder="Contoh: -5 untuk mengurangi 5 unit"
              {...register('quantity_change')}
            />
            <p className="text-xs text-muted-foreground">
              Isi negatif untuk mengurangi (rusak/hilang), positif untuk menambah.
            </p>
            {errors.quantity_change && (
              <p className="text-sm text-destructive">{errors.quantity_change.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea id="reason" placeholder="Misal: rusak saat stock opname" {...register('reason')} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
