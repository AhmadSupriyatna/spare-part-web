import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createOutsideLineMachine } from '@/features/machines/api'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const outsideLineMachineSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  category: z.string().optional(),
})

type OutsideLineMachineFormValues = z.infer<typeof outsideLineMachineSchema>

interface OutsideLineMachineFormDialogProps {
  branchId: number
  branchName: string
  trigger: React.ReactNode
  /**
   * Controlled open state — needed when the trigger lives inside a
   * DropdownMenu: the menu unmounts its popup content (and everything
   * nested in it, including this dialog's own internal `open` state) the
   * instant an item is clicked, so open state must be lifted to a parent
   * that outlives the menu. Falls back to internal state otherwise.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * "Mesin Luar Line" — create-only dialog for a machine that belongs
 * directly to a Branch (compressor room, genset, water treatment...), with
 * no production Line. Deliberately create-only and name-only, mirroring
 * OutsideLineEquipmentFormDialog: no Line picker, code is system-generated
 * server-side (see Machine::generateCodeForBranch()).
 */
export function OutsideLineMachineFormDialog({
  branchId,
  branchName,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: OutsideLineMachineFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OutsideLineMachineFormValues>({
    resolver: zodResolver(outsideLineMachineSchema),
    defaultValues: { name: '', category: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ name: '', category: '' })
    }
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (values: OutsideLineMachineFormValues) => createOutsideLineMachine(branchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outside-line-machines', branchId] })
      toast.success('Mesin luar line berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan mesin.'),
  })

  return (
    <FormSheet
      trigger={trigger}
      title="Tambah Mesin Luar Line"
      description="Untuk mesin yang tidak berada di bawah line produksi, seperti compressor room, genset, atau water treatment."
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label>Plant</Label>
        <p className="text-sm text-muted-foreground">{branchName}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ol-machine-code">Kode</Label>
        <p className="text-sm text-muted-foreground italic">Dibuat otomatis dari nama saat disimpan.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ol-machine-name">Nama</Label>
        <Input id="ol-machine-name" placeholder="Compressor Room" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ol-machine-category">Kategori</Label>
        <Input id="ol-machine-category" placeholder="Utility" {...register('category')} />
      </div>
    </FormSheet>
  )
}
