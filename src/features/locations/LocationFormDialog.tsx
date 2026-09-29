import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLocation, createRack, createRackLevel, fetchRacks, updateLocation } from '@/features/locations/api'
import type { Location } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const locationSchema = z.object({
  code: z.string().max(50, 'Maksimal 50 karakter').optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
})

type LocationFormValues = z.infer<typeof locationSchema>

interface LocationFormDialogProps {
  branchId: number
  location?: Location
  trigger: React.ReactNode
}

/**
 * "Tambah Lokasi" just asks for a description — the Rack/RackLevel
 * hierarchy underneath (still what `code` is generated from) is an
 * implementation detail now, not something the user manages directly: this
 * reuses the first rack/level for the branch, creating one behind the
 * scenes the very first time, since the old rack-map UI (with its own
 * Tambah Rak/Tambah Tingkat buttons) was removed in favor of a flat
 * registration list.
 */
export function LocationFormDialog({ branchId, location, trigger }: LocationFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(location)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      code: location?.code ?? '',
      description: location?.description ?? '',
      is_active: location?.is_active ?? true,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: location?.code ?? '',
        description: location?.description ?? '',
        is_active: location?.is_active ?? true,
      })
    }
  }, [open, location, reset])

  const mutation = useMutation({
    mutationFn: async (values: LocationFormValues) => {
      const code = values.code?.trim() || undefined

      if (location) return updateLocation(location.id, { ...values, code })

      const racks = await fetchRacks(branchId)
      const rack = racks[0] ?? (await createRack(branchId))
      const level = rack.levels[0] ?? (await createRackLevel(rack.id))
      return createLocation(level.id, { description: values.description, code })
    },
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
            <Input id="code" className="font-mono" placeholder="Kosongkan untuk kode otomatis" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              placeholder="Misal: Rak dekat pintu masuk gudang"
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          {isEdit && (
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label className="flex w-fit items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Aktif
                </label>
              )}
            />
          )}
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
