import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addLineRuntime } from '@/features/lines/api'
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

const runtimeSchema = z.object({
  hours: z
    .string()
    .min(1, 'Jam wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 1, 'Minimal 1 jam'),
})

type RuntimeFormValues = z.infer<typeof runtimeSchema>

interface AddRuntimeDialogProps {
  lineId: number
  branchId: number
}

export function AddRuntimeDialog({ lineId, branchId }: AddRuntimeDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RuntimeFormValues>({ resolver: zodResolver(runtimeSchema) })

  const mutation = useMutation({
    mutationFn: (values: RuntimeFormValues) => addLineRuntime(lineId, Number(values.hours)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines', branchId] })
      queryClient.invalidateQueries({ queryKey: ['line', lineId] })
      toast.success('Jam operasi berhasil ditambahkan.')
      reset()
      setOpen(false)
    },
    onError: () => toast.error('Gagal menambahkan jam operasi.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Tambah Jam Operasi</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Jam Operasi</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hours">Jumlah Jam</Label>
            <Input id="hours" type="number" min={1} {...register('hours')} />
            {errors.hours && <p className="text-sm text-destructive">{errors.hours.message}</p>}
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
