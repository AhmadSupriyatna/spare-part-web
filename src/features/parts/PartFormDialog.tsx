import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPart, updatePart } from '@/features/parts/api'
import { partSchema, type PartFormValues } from '@/features/parts/schema'
import type { Part } from '@/types/inventory'
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

interface PartFormDialogProps {
  part?: Part
  trigger: React.ReactNode
}

export function PartFormDialog({ part, trigger }: PartFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(part)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      sku: part?.sku ?? '',
      name: part?.name ?? '',
      description: part?.description ?? '',
      unit: part?.unit ?? 'pcs',
      category: part?.category ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        sku: part?.sku ?? '',
        name: part?.name ?? '',
        description: part?.description ?? '',
        unit: part?.unit ?? 'pcs',
        category: part?.category ?? '',
      })
    }
  }, [open, part, reset])

  const mutation = useMutation({
    mutationFn: (values: PartFormValues) => (isEdit ? updatePart(part!.id, values) : createPart(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success(isEdit ? 'Part berhasil diperbarui.' : 'Part berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => {
      toast.error('Gagal menyimpan part. Periksa kembali data yang diisi.')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Part' : 'Tambah Part'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} />
            {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Satuan</Label>
              <Input id="unit" placeholder="pcs" {...register('unit')} />
              {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Kategori</Label>
              <Input id="category" placeholder="Mekanikal" {...register('category')} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Input id="description" {...register('description')} />
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
