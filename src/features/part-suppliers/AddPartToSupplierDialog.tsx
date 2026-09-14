import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addPartSupplier } from '@/features/part-suppliers/api'
import { fetchParts } from '@/features/parts/api'
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

const addPartToSupplierSchema = z.object({
  part_id: z.string().min(1, 'Pilih part'),
  price: z.string().optional(),
  lead_time_days: z.string().optional(),
  is_preferred: z.boolean().optional(),
  notes: z.string().optional(),
})

type AddPartToSupplierFormValues = z.infer<typeof addPartToSupplierSchema>

interface AddPartToSupplierDialogProps {
  supplierId: number
  trigger: React.ReactNode
}

export function AddPartToSupplierDialog({ supplierId, trigger }: AddPartToSupplierDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPartToSupplierFormValues>({
    resolver: zodResolver(addPartToSupplierSchema),
    defaultValues: { part_id: '', price: '', lead_time_days: '', is_preferred: false, notes: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: AddPartToSupplierFormValues) =>
      addPartSupplier(Number(values.part_id), {
        supplier_id: supplierId,
        price: values.price ? Number(values.price) : null,
        lead_time_days: values.lead_time_days ? Number(values.lead_time_days) : null,
        is_preferred: values.is_preferred ?? false,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts-for-supplier', supplierId] })
      toast.success('Part berhasil ditambahkan ke supplier ini.')
      setOpen(false)
      reset()
    },
    onError: () => toast.error('Gagal menambahkan part.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Part ke Supplier</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Part</Label>
            <Controller
              control={control}
              name="part_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih part" />
                  </SelectTrigger>
                  <SelectContent>
                    {parts?.map((part) => (
                      <SelectItem key={part.id} value={String(part.id)}>
                        {part.name} ({part.item_master_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.part_id && <p className="text-sm text-destructive">{errors.part_id.message}</p>}
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
            Jadikan supplier utama (preferred) untuk part ini
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
