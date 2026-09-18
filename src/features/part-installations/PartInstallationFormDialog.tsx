import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { installPart } from '@/features/part-installations/api'
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

const partInstallationSchema = z.object({
  part_id: z.string().min(1, 'Pilih part'),
  installed_at: z.string().optional(),
  notes: z.string().optional(),
})

type PartInstallationFormValues = z.infer<typeof partInstallationSchema>

interface PartInstallationFormDialogProps {
  equipmentId: number
  trigger: React.ReactNode
}

/**
 * Only ever installs a brand-new unit — no picker for reinstalling an
 * existing repaired unit. That option used to live here (as a `part_unit_id`
 * dropdown) and let anyone with Admin Spare Part reinstall a repaired unit
 * with zero oversight, bypassing the Supervisor approval that the QR-scan
 * reinstall flow (scan the unit's printed QR from the Repair Part board)
 * always goes through. This dialog is for genuinely new installs — initial
 * data setup or freshly received parts — not for putting a repaired unit
 * back into service.
 */
export function PartInstallationFormDialog({ equipmentId, trigger }: PartInstallationFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartInstallationFormValues>({
    resolver: zodResolver(partInstallationSchema),
    defaultValues: { part_id: '', installed_at: '', notes: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: PartInstallationFormValues) =>
      installPart(equipmentId, {
        part_id: Number(values.part_id),
        part_unit_id: null,
        installed_at: values.installed_at || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success('Part berhasil dipasang.')
      setOpen(false)
      reset()
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memasang part.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pasang Part Baru</DialogTitle>
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
            <p className="text-xs text-muted-foreground">
              Ini selalu memasang unit baru. Untuk memasang ulang unit bekas yang sudah selesai
              diperbaiki, gunakan tombol Scan QR di kartu part tersebut pada Papan Repair — perlu
              persetujuan Supervisor.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="installed_at">Tanggal Pasang</Label>
            <Input id="installed_at" type="date" {...register('installed_at')} />
            <p className="text-xs text-muted-foreground">Kosongkan untuk memakai waktu sekarang.</p>
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
