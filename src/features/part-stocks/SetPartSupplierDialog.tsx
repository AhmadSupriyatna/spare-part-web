import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { updatePartStockSupplier } from '@/features/part-stocks/api'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const setSupplierSchema = z.object({
  supplier_id: z.string().min(1, 'Pilih supplier'),
})

type SetSupplierFormValues = z.infer<typeof setSupplierSchema>

interface SetPartSupplierDialogProps {
  partStockId: number
  branchId: number
  currentSupplierId: number | null
  trigger: React.ReactNode
}

/**
 * Standalone "Pilih Supplier" — changes which supplier this stock is
 * sourced from without receiving anything, unlike ReceiveStockDialog where
 * picking a supplier is just a side effect of recording a receipt.
 */
export function SetPartSupplierDialog({ partStockId, branchId, currentSupplierId, trigger }: SetPartSupplierDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => fetchSuppliers(branchId),
    enabled: open,
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SetSupplierFormValues>({
    resolver: zodResolver(setSupplierSchema),
    defaultValues: { supplier_id: currentSupplierId ? String(currentSupplierId) : '' },
  })

  const mutation = useMutation({
    mutationFn: (values: SetSupplierFormValues) => updatePartStockSupplier(partStockId, Number(values.supplier_id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      queryClient.invalidateQueries({ queryKey: ['part-stock', partStockId] })
      toast.success('Supplier berhasil disimpan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan supplier.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Supplier</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Supplier</Label>
            <Controller
              control={control}
              name="supplier_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={suppliersLoading ? 'Memuat supplier...' : 'Pilih supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
            {suppliers?.length === 0 && !suppliersLoading && (
              <p className="text-xs text-muted-foreground">Belum ada supplier di plant ini. Tambah dulu lewat menu Supplier.</p>
            )}
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
