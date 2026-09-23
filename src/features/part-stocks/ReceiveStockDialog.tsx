import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPartStock, receiveStock } from '@/features/part-stocks/api'
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

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

interface ReceiveStockDialogProps {
  branchId: number
  /** An existing part_stocks row — tops it up via POST /part-stocks/{id}/receive. */
  partStockId?: number
  /** A part with no part_stocks row for this branch yet — creates one via POST /branches/{branch}/part-stocks. */
  partId?: number
  currentQuantity?: number
  currentUnitCost?: string
  trigger?: React.ReactNode
}

/**
 * Handles two cases behind one form: topping up a part that already has a
 * part_stocks row here (`partStockId`, the established flow — Kelola Stok's
 * per-row action, Part detail page) or receiving a part into this branch's
 * stock for the very first time (`partId`, used by the standalone Stock In
 * page, whose part list is the whole catalog rather than just parts already
 * stocked here). Exactly one of the two must be given.
 */
export function ReceiveStockDialog({
  branchId,
  partStockId,
  partId,
  currentQuantity = 0,
  currentUnitCost = '0',
  trigger,
}: ReceiveStockDialogProps) {
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
    watch,
    formState: { errors },
  } = useForm<ReceiveStockFormValues>({
    resolver: zodResolver(receiveStockSchema),
  })

  const quantity = Number(watch('quantity'))
  const totalPrice = Number(watch('total_price'))
  const oldUnitCost = Number(currentUnitCost)
  const newQuantity = currentQuantity + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0)
  const showPreview = quantity > 0 && totalPrice >= 0 && !Number.isNaN(totalPrice)
  const newAverageCost = showPreview
    ? (oldUnitCost * currentQuantity + totalPrice) / newQuantity
    : null

  const mutation = useMutation({
    mutationFn: (values: ReceiveStockFormValues) => {
      const payload = {
        quantity: Number(values.quantity),
        total_price: Number(values.total_price),
        supplier_id: values.supplier_id ? Number(values.supplier_id) : undefined,
        notes: values.notes,
      }
      return partStockId
        ? receiveStock(partStockId, payload)
        : createPartStock(branchId, { ...payload, part_id: partId! })
    },
    onSuccess: () => {
      if (partStockId) {
        queryClient.invalidateQueries({ queryKey: ['part-stock', partStockId] })
        queryClient.invalidateQueries({ queryKey: ['part-stock-ledger', partStockId] })
      }
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Barang berhasil diterima.')
      reset()
      setOpen(false)
    },
    onError: () => toast.error('Gagal mencatat penerimaan barang.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={(trigger ?? <Button>Terima Barang</Button>) as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terima Barang</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <p className="text-xs text-muted-foreground">
            Stok saat ini: <span className="font-medium text-foreground">{currentQuantity} unit</span> @{' '}
            <span className="font-medium text-foreground">{currencyFormatter.format(oldUnitCost)}</span>
            /unit
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">Jumlah Diterima</Label>
            <Input id="quantity" type="number" min={1} {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="total_price">Harga Total Pembelian</Label>
            <Input id="total_price" type="number" min={0} step="0.01" {...register('total_price')} />
            <p className="text-xs text-muted-foreground">
              Total harga untuk seluruh jumlah yang diterima kali ini, bukan harga per unit.
            </p>
            {errors.total_price && <p className="text-sm text-destructive">{errors.total_price.message}</p>}
          </div>
          {showPreview && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Harga rata-rata baru (setelah digabung dengan stok lama)
              </p>
              <p className="font-medium">
                {currencyFormatter.format(newAverageCost ?? 0)} /unit &middot; {newQuantity} unit
              </p>
            </div>
          )}
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
