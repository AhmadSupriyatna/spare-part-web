import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPart, updatePart } from '@/features/parts/api'
import { partSchema, type PartFormValues } from '@/features/parts/schema'
import { fetchUnits } from '@/features/units/api'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PartFormDialogProps {
  part?: Part
  trigger: React.ReactNode
}

export function PartFormDialog({ part, trigger }: PartFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(part?.image_url ?? null)
  const queryClient = useQueryClient()
  const isEdit = Boolean(part)

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: fetchUnits,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      item_master_no: part?.item_master_no ?? '',
      name: part?.name ?? '',
      description: part?.description ?? '',
      unit: part?.unit ?? 'pcs',
      category: part?.category ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        item_master_no: part?.item_master_no ?? '',
        name: part?.name ?? '',
        description: part?.description ?? '',
        unit: part?.unit ?? 'pcs',
        category: part?.category ?? '',
      })
      setImageFile(null)
      setImagePreview(part?.image_url ?? null)
    }
  }, [open, part, reset])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : (part?.image_url ?? null))
  }

  const mutation = useMutation({
    mutationFn: (values: PartFormValues) => {
      const payload = { ...values, image: imageFile }
      return isEdit ? updatePart(part!.id, payload) : createPart(payload)
    },
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
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex flex-col items-center gap-2">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Pratinjau"
                className="h-32 w-32 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                Belum ada foto
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleImageChange} className="max-w-xs" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="item_master_no">Item Master</Label>
            <Input id="item_master_no" {...register('item_master_no')} />
            {errors.item_master_no && (
              <p className="text-sm text-destructive">{errors.item_master_no.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Satuan</Label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.name}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
