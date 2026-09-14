import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createSupplier, updateSupplier } from '@/features/suppliers/api'
import type { Supplier } from '@/types/inventory'
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

const supplierSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

interface SupplierFormDialogProps {
  branchId: number
  supplier?: Supplier
  trigger: React.ReactNode
}

export function SupplierFormDialog({ branchId, supplier, trigger }: SupplierFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(supplier)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      contact_person: supplier?.contact_person ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      notes: supplier?.notes ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? '',
        contact_person: supplier?.contact_person ?? '',
        phone: supplier?.phone ?? '',
        email: supplier?.email ?? '',
        address: supplier?.address ?? '',
        notes: supplier?.notes ?? '',
      })
    }
  }, [open, supplier, reset])

  const mutation = useMutation({
    mutationFn: (values: SupplierFormValues) =>
      isEdit ? updateSupplier(supplier!.id, values) : createSupplier(branchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', branchId] })
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
        <form
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact_person">Kontak Person</Label>
            <Input id="contact_person" {...register('contact_person')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" {...register('address')} />
          </div>
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
