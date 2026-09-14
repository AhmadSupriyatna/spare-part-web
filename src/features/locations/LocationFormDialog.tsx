import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLocation, updateLocation } from '@/features/locations/api'
import type { Location } from '@/types/inventory'
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

const locationSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(50),
  rack: z.string().min(1, 'Rak wajib diisi').max(50),
  bin: z.string().min(1, 'Bin wajib diisi').max(50),
  description: z.string().optional(),
})

type LocationFormValues = z.infer<typeof locationSchema>

interface LocationFormDialogProps {
  branchId: number
  location?: Location
  trigger: React.ReactNode
}

export function LocationFormDialog({ branchId, location, trigger }: LocationFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(location)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      code: location?.code ?? '',
      rack: location?.rack ?? '',
      bin: location?.bin ?? '',
      description: location?.description ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: location?.code ?? '',
        rack: location?.rack ?? '',
        bin: location?.bin ?? '',
        description: location?.description ?? '',
      })
    }
  }, [open, location, reset])

  const mutation = useMutation({
    mutationFn: (values: LocationFormValues) =>
      isEdit ? updateLocation(location!.id, values) : createLocation(branchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', branchId] })
      toast.success(isEdit ? 'Lokasi berhasil diperbarui.' : 'Lokasi berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan lokasi.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Lokasi' : 'Tambah Lokasi'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Kode</Label>
            <Input id="code" placeholder="A1-B1" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rack">Rak</Label>
              <Input id="rack" placeholder="A1" {...register('rack')} />
              {errors.rack && <p className="text-sm text-destructive">{errors.rack.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bin">Bin</Label>
              <Input id="bin" placeholder="B1" {...register('bin')} />
              {errors.bin && <p className="text-sm text-destructive">{errors.bin.message}</p>}
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
