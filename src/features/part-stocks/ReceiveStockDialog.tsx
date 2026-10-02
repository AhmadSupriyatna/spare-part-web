import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPartStock, receiveStock } from '@/features/part-stocks/api'
import { receiveStockSchema, type ReceiveStockFormValues } from '@/features/part-stocks/schema'
import { fetchPartSuppliers } from '@/features/part-suppliers/api'
import { FormSheet } from '@/components/FormSheet'
import { PartUnitBulkQrPrint, type NewPartUnit } from '@/components/PartUnitBulkQrPrint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

interface ReceiveStockDialogProps {
  branchId: number
  /** Always required now — identifies which Part this receipt is for, both for the header display and for scoping the supplier list to only this part's registered suppliers. */
  partId: number
  partName?: string
  itemMasterNo?: string
  /** Part Passport — shows the "Tanggal Kedatangan" field, since that's the only case a received unit's arrival date means anything. */
  hasPassport?: boolean
  /** An existing part_stocks row — tops it up via POST /part-stocks/{id}/receive. */
  partStockId?: number
  currentQuantity?: number
  currentUnitCost?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Handles two cases behind one form: topping up a part that already has a
 * part_stocks row here (`partStockId`, the established flow — Inventory
 * Workspace's per-card action, Part detail page) or receiving a part into
 * this branch's stock for the very first time (no `partStockId`).
 */
export function ReceiveStockDialog({
  branchId,
  partId,
  partName,
  itemMasterNo,
  hasPassport = false,
  partStockId,
  currentQuantity = 0,
  currentUnitCost = '0',
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: ReceiveStockDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  // "Part Passport" — populated from the receive response when the Part
  // has_passport, prompting a bulk QR print right after a successful Stock
  // In instead of leaving the new units to be found/printed later.
  const [newUnits, setNewUnits] = useState<NewPartUnit[]>([])
  const queryClient = useQueryClient()

  const { data: partSuppliers } = useQuery({
    queryKey: ['part-suppliers', partId],
    queryFn: () => fetchPartSuppliers(partId),
    enabled: open,
  })
  const suppliers = partSuppliers?.filter((ps) => ps.branch_id === branchId)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ReceiveStockFormValues>({
    resolver: zodResolver(receiveStockSchema),
  })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const quantity = Number(watch('quantity'))
  const totalPrice = Number(watch('total_price'))
  const oldUnitCost = Number(currentUnitCost)
  const newQuantity = currentQuantity + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0)
  const showPreview = quantity > 0 && totalPrice >= 0 && !Number.isNaN(totalPrice)
  const newAverageCost = showPreview ? (oldUnitCost * currentQuantity + totalPrice) / newQuantity : null

  const mutation = useMutation({
    mutationFn: (values: ReceiveStockFormValues) => {
      const payload = {
        quantity: Number(values.quantity),
        total_price: Number(values.total_price),
        supplier_id: values.supplier_id ? Number(values.supplier_id) : undefined,
        notes: values.notes,
        arrived_at: values.arrived_at || undefined,
      }
      return partStockId
        ? receiveStock(partStockId, payload)
        : createPartStock(branchId, { ...payload, part_id: partId })
    },
    onSuccess: (result) => {
      if (partStockId) {
        queryClient.invalidateQueries({ queryKey: ['part-stock', partStockId] })
        queryClient.invalidateQueries({ queryKey: ['part-stock-ledger', partStockId] })
      }
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Barang berhasil diterima.')
      reset()
      setOpen(false)
      if (result.newUnits.length > 0) setNewUnits(result.newUnits)
    },
    onError: () => toast.error('Gagal mencatat penerimaan barang.'),
  })

  return (
    <>
      <FormSheet
        trigger={trigger ?? <Button>Stock In</Button>}
        title="Stock In"
        open={open}
        onOpenChange={setOpen}
        isDirty={isDirty}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        submitLabel="Simpan"
        isSubmitting={mutation.isPending}
      >
        {(partName || itemMasterNo) && (
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            {partName && <p className="text-sm font-medium">{partName}</p>}
            {itemMasterNo && <p className="font-mono text-xs text-muted-foreground">{itemMasterNo}</p>}
          </div>
        )}
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
        {hasPassport && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="arrived_at">Tanggal Kedatangan</Label>
            <Input id="arrived_at" type="date" max={new Date().toISOString().slice(0, 10)} {...register('arrived_at')} />
            <p className="text-xs text-muted-foreground">
              Kosongkan untuk pakai hari ini — isi kalau mencatat penerimaan yang sudah lewat.
            </p>
          </div>
        )}
        {showPreview && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Harga rata-rata baru (setelah digabung dengan stok lama)</p>
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
              {suppliers?.map((ps) => (
                <SelectItem key={ps.supplier_id} value={String(ps.supplier_id)}>
                  {ps.supplier_name}
                  {ps.is_preferred && ' (Utama)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suppliers?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Belum ada supplier terdaftar untuk part ini — atur lewat "Pilih Supplier" di Kelola Stok.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Catatan</Label>
          <Textarea id="notes" placeholder="Misal: No. PO" {...register('notes')} />
        </div>
      </FormSheet>

      <PartUnitBulkQrPrint units={newUnits} open={newUnits.length > 0} onOpenChange={(next) => !next && setNewUnits([])} />
    </>
  )
}
