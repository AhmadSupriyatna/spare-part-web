import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { StockLedgerReportEntry } from '@/features/part-stocks/api'
import { updateStockLedgerReceiving } from '@/features/part-stocks/api'
import { editStockInSchema, type EditStockInFormValues } from '@/features/part-stocks/schema'
import { fetchPartSuppliers } from '@/features/part-suppliers/api'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface EditStockInDialogProps {
  branchId: number
  entry: StockLedgerReportEntry | null
  onOpenChange: (open: boolean) => void
}

/**
 * Correcting a mistyped Stock In — only ever offered on a row the backend
 * flagged `is_editable` (the single most recent receiving entry for that
 * part_stock, see StockLedgerController). Quantity on a has_passport
 * part's receiving is rejected server-side (422) since each unit already
 * has its own QR; this form still lets the price/notes/date through for
 * that case, same request shape either way.
 */
export function EditStockInDialog({ branchId, entry, onOpenChange }: EditStockInDialogProps) {
  const queryClient = useQueryClient()
  const open = !!entry

  const { data: partSuppliers } = useQuery({
    queryKey: ['part-suppliers', entry?.part_id],
    queryFn: () => fetchPartSuppliers(entry!.part_id),
    enabled: open,
  })
  const suppliers = partSuppliers?.filter((ps) => ps.branch_id === branchId)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditStockInFormValues>({
    resolver: zodResolver(editStockInSchema),
  })

  useEffect(() => {
    if (!entry) return
    reset({
      quantity: String(entry.quantity_change),
      total_price: entry.unit_cost != null ? String(Number(entry.unit_cost) * entry.quantity_change) : '',
      notes: entry.notes ?? '',
      occurred_at: entry.occurred_at.slice(0, 10),
    })
  }, [entry, reset])

  const mutation = useMutation({
    mutationFn: (values: EditStockInFormValues) =>
      updateStockLedgerReceiving(entry!.id, {
        quantity: Number(values.quantity),
        total_price: Number(values.total_price),
        supplier_id: values.supplier_id ? Number(values.supplier_id) : undefined,
        notes: values.notes,
        occurred_at: values.occurred_at || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-ledger-report', branchId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Transaksi penerimaan berhasil diperbarui.')
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui transaksi.'
      toast.error(message)
    },
  })

  return (
    <FormSheet
      trigger={<span className="hidden" aria-hidden="true" />}
      title="Edit Stock In"
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      {entry && (
        <div className="rounded-md border bg-muted/40 px-3 py-2">
          <p className="text-sm font-medium">{entry.part_name}</p>
          <p className="font-mono text-xs text-muted-foreground">{entry.item_master_no}</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-stockin-quantity">Jumlah Diterima</Label>
        <Input id="edit-stockin-quantity" type="number" min={1} {...register('quantity')} />
        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-stockin-total-price">Harga Total Pembelian</Label>
        <Input id="edit-stockin-total-price" type="number" min={0} step="0.01" {...register('total_price')} />
        {errors.total_price && <p className="text-sm text-destructive">{errors.total_price.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-stockin-date">Tanggal</Label>
        <Input id="edit-stockin-date" type="date" max={new Date().toISOString().slice(0, 10)} {...register('occurred_at')} />
      </div>
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
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-stockin-notes">Catatan</Label>
        <Textarea id="edit-stockin-notes" placeholder="Misal: No. PO" {...register('notes')} />
      </div>
    </FormSheet>
  )
}
