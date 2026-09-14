import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchBranches } from '@/features/branches/api'
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
  partSupplier?: PartSupplier
  /** Pre-selects this branch when adding a new supplier link (e.g. the page's active branch). Ignored when editing. */
  defaultBranchId?: number
  trigger: React.ReactNode
}

export function PartSupplierFormDialog({
  partId,
  partSupplier,
  defaultBranchId,
  trigger,
}: PartSupplierFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    defaultBranchId ? String(defaultBranchId) : '',
  )
  const queryClient = useQueryClient()
  const isEdit = Boolean(partSupplier)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    enabled: open && !isEdit,
  })

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', selectedBranchId],
    queryFn: () => fetchSuppliers(Number(selectedBranchId)),
    enabled: open && !isEdit && !!selectedBranchId,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
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
      setSelectedBranchId(defaultBranchId ? String(defaultBranchId) : '')
      reset({
        supplier_id: partSupplier ? String(partSupplier.supplier_id) : '',
        price: partSupplier?.price ?? '',
        lead_time_days: partSupplier?.lead_time_days != null ? String(partSupplier.lead_time_days) : '',
        is_preferred: partSupplier?.is_preferred ?? false,
        notes: partSupplier?.notes ?? '',
      })
    }
  }, [open, partSupplier, defaultBranchId, reset])

  function handleBranchChange(value: string | null) {
    setSelectedBranchId(value ?? '')
    setValue('supplier_id', '')
  }

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
          {isEdit ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="text-sm font-medium">{partSupplier?.supplier_name}</p>
              <p className="text-xs text-muted-foreground">{partSupplier?.branch_name}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label>Cabang</Label>
                <Select value={selectedBranchId} onValueChange={handleBranchChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.code} — {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Supplier terikat ke satu cabang. Pilih cabangnya dulu untuk melihat daftar suppliernya.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Supplier</Label>
                <Controller
                  control={control}
                  name="supplier_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedBranchId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedBranchId
                              ? 'Pilih cabang dulu'
                              : suppliersLoading
                                ? 'Memuat supplier...'
                                : 'Pilih supplier'
                          }
                        />
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
                {errors.supplier_id && (
                  <p className="text-sm text-destructive">{errors.supplier_id.message}</p>
                )}
                {selectedBranchId && suppliers?.length === 0 && !suppliersLoading && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada supplier di cabang ini. Tambah dulu lewat menu Supplier.
                  </p>
                )}
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Harga</Label>
              <Input id="price" type="number" min={0} step="0.01" placeholder="0" {...register('price')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead_time_days">Lead Time (hari)</Label>
              <Input id="lead_time_days" type="number" min={0} placeholder="0" {...register('lead_time_days')} />
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
            <input type="checkbox" className="h-4 w-4" {...register('is_preferred')} />
            Jadikan supplier utama (preferred) untuk part ini
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" placeholder="Opsional" {...register('notes')} />
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
