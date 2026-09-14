import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addPartSupplier, updatePartSupplier } from '@/features/part-suppliers/api'
import { fetchSuppliers } from '@/features/suppliers/api'
import type { PartSupplier } from '@/types/relations'
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

const partSupplierSchema = z.object({
  supplier_id: z.string().min(1, 'Pilih supplier'),
  price: z.string().optional(),
  lead_time_days: z.string().optional(),
  is_preferred: z.boolean().optional(),
  notes: z.string().optional(),
})

type PartSupplierFormValues = z.infer<typeof partSupplierSchema>

interface PartSupplierFormDialogProps {
  partId: number
  branchId: number
  partSupplier?: PartSupplier
  trigger: React.ReactNode
}

export function PartSupplierFormDialog({
  partId,
  branchId,
  partSupplier,
  trigger,
}: PartSupplierFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(partSupplier)

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => fetchSuppliers(branchId),
    enabled: open && !isEdit,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartSupplierFormValues>({
    resolver: zodResolver(partSupplierSchema),
    defaultValues: {
      supplier_id: partSupplier ? String(partSupplier.supplier_id) : '',
      price: partSupplier?.price ?? '',
      lead_time_days: partSupplier?.lead_time_days != null ? String(partSupplier.lead_time_days) : '',
      is_preferred: partSupplier?.is_preferred ?? false,
      notes: partSupplier?.notes ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        supplier_id: partSupplier ? String(partSupplier.supplier_id) : '',
        price: partSupplier?.price ?? '',
        lead_time_days: partSupplier?.lead_time_days != null ? String(partSupplier.lead_time_days) : '',
        is_preferred: partSupplier?.is_preferred ?? false,
        notes: partSupplier?.notes ?? '',
      })
    }
  }, [open, partSupplier, reset])

  const mutation = useMutation({
    mutationFn: (values: PartSupplierFormValues) => {
      const payload = {
        supplier_id: Number(values.supplier_id),
        price: values.price ? Number(values.price) : null,
        lead_time_days: values.lead_time_days ? Number(values.lead_time_days) : null,
        is_preferred: values.is_preferred ?? false,
        notes: values.notes || null,
      }
      return isEdit ? updatePartSupplier(partSupplier!.id, payload) : addPartSupplier(partId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-suppliers', partId] })
      toast.success(isEdit ? 'Supplier berhasil diperbarui.' : 'Supplier berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan supplier.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Supplier' : 'Tambah Supplier'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Supplier</Label>
            <Controller
              control={control}
              name="supplier_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {isEdit && partSupplier ? (
                      <SelectItem value={String(partSupplier.supplier_id)}>
                        {partSupplier.supplier_name}
                      </SelectItem>
                    ) : (
                      suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Harga</Label>
              <Input id="price" type="number" min={0} step="0.01" {...register('price')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead_time_days">Lead Time (hari)</Label>
              <Input id="lead_time_days" type="number" min={0} {...register('lead_time_days')} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" {...register('is_preferred')} />
            Jadikan supplier utama (preferred)
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" {...register('notes')} />
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
