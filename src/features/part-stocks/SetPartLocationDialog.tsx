import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchLocations } from '@/features/locations/api'
import { updatePartStockLocation } from '@/features/part-stocks/api'
import { FormSheet } from '@/components/FormSheet'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const setLocationSchema = z.object({
  location_id: z.string().min(1, 'Pilih lokasi'),
})

type SetLocationFormValues = z.infer<typeof setLocationSchema>

interface SetPartLocationDialogProps {
  partId: number
  partStockId: number
  branchId: number
  branchName?: string
  currentLocationId: number | null
  trigger: React.ReactNode
}

export function SetPartLocationDialog({
  partId,
  partStockId,
  branchId,
  branchName,
  currentLocationId,
  trigger,
}: SetPartLocationDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', branchId],
    queryFn: () => fetchLocations(branchId),
    enabled: open,
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SetLocationFormValues>({
    resolver: zodResolver(setLocationSchema),
    defaultValues: { location_id: currentLocationId ? String(currentLocationId) : '' },
  })

  const mutation = useMutation({
    mutationFn: (values: SetLocationFormValues) =>
      updatePartStockLocation(partStockId, Number(values.location_id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part', partId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Lokasi part berhasil disimpan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan lokasi.'),
  })

  return (
    <FormSheet
      trigger={trigger}
      title={`Edit Lokasi${branchName ? ` — ${branchName}` : ''}`}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label>Lokasi (Rak/Bin)</Label>
        <Controller
          control={control}
          name="location_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={locationsLoading ? 'Memuat lokasi...' : 'Pilih lokasi'} />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.code} {location.description ? `— ${location.description}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.location_id && <p className="text-sm text-destructive">{errors.location_id.message}</p>}
        {locations?.length === 0 && !locationsLoading && (
          <p className="text-xs text-muted-foreground">Belum ada lokasi di plant ini. Tambah dulu lewat menu Lokasi.</p>
        )}
      </div>
    </FormSheet>
  )
}
