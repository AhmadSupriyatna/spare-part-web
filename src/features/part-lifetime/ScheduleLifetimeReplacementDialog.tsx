import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { scheduleLifetimeReplacement } from '@/features/part-lifetime/api'
import { fetchUsers } from '@/features/users/api'
import type { PartInstallation } from '@/types/relations'
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

const scheduleSchema = z.object({
  due_date: z.string().min(1, 'Tanggal wajib diisi'),
  assigned_to: z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

interface ScheduleLifetimeReplacementDialogProps {
  installation: PartInstallation
  invalidateKeys: unknown[][]
  trigger: React.ReactNode
}

export function ScheduleLifetimeReplacementDialog({
  installation,
  invalidateKeys,
  trigger,
}: ScheduleLifetimeReplacementDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    enabled: open,
  })
  const assignableUsers = users?.filter(
    (user) => user.roles.includes('teknisi') || user.roles.includes('engineer'),
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { due_date: '', assigned_to: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: ScheduleFormValues) =>
      scheduleLifetimeReplacement(installation.id, {
        due_date: values.due_date,
        assigned_to: values.assigned_to ? Number(values.assigned_to) : null,
      }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success('Penggantian part berhasil dijadwalkan.')
      setOpen(false)
      reset()
    },
    onError: () => toast.error('Gagal menjadwalkan.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jadwalkan Penggantian</DialogTitle>
        </DialogHeader>
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">{installation.part_name}</p>
          <p className="text-muted-foreground">
            {installation.equipment_name} · {installation.machine_name} · {installation.line_name}
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="due_date">Tanggal Jadwal</Label>
            <Input id="due_date" type="date" {...register('due_date')} />
            {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tugaskan ke</Label>
            <Controller
              control={control}
              name="assigned_to"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih teknisi/engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers?.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menjadwalkan...' : 'Jadwalkan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
