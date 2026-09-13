import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { receiveStock } from '@/features/part-stocks/api'
import { receiveStockSchema, type ReceiveStockFormValues } from '@/features/part-stocks/schema'
import { fetchSuppliers } from '@/features/suppliers/api'
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

interface ReceiveStockDialogProps {
  partStockId: number
  branchId: number
}

export function ReceiveStockDialog({ partStockId, branchId }: ReceiveStockDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => fetchSuppliers(branchId),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReceiveStockFormValues>({
    resolver: zodResolver(receiveStockSchema),
  })

  const mutation = useMutation({
    mutationFn: (values: ReceiveStockFormValues) =>
      receiveStock(partStockId, {
        quantity: Number(values.quantity),
        supplier_id: values.supplier_id ? Number(values.supplier_id) : undefined,
        notes: values.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-stock', partStockId] })
      queryClient.invalidateQueries({ queryKey: ['part-stock-ledger', partStockId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Barang berhasil diterima.')
      reset()
      setOpen(false)
    },
    onError: () => toast.error('Gagal mencatat penerimaan barang.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Terima Barang</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terima Barang</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">Jumlah Diterima</Label>
            <Input id="quantity" type="number" min={1} {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Supplier (opsional)</Label>
            <Select onValueChange={(value) => setValue('supplier_id', value as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" placeholder="Misal: No. PO" {...register('notes')} />
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
