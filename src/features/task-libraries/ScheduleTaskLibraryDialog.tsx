import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { scheduleTaskLibrary } from '@/features/task-libraries/api'
import { fetchUsers } from '@/features/users/api'
import type { TaskLibrary } from '@/types/pm'
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
  task_library_id: z.string().min(1, 'Pilih kegiatan PM'),
  due_date: z.string().min(1, 'Tanggal wajib diisi'),
  assigned_to: z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

interface ScheduleTaskLibraryDialogProps {
  libraries: TaskLibrary[]
  defaultLibraryId?: number
  defaultDate?: string
  invalidateKeys: unknown[][]
  trigger: React.ReactNode
}

export function ScheduleTaskLibraryDialog({
  libraries,
  defaultLibraryId,
  defaultDate,
  invalidateKeys,
  trigger,
}: ScheduleTaskLibraryDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const lockedLibrary = defaultLibraryId
    ? libraries.find((library) => library.id === defaultLibraryId)
    : libraries.length === 1
      ? libraries[0]
      : null
  const resolvedLibraryId = lockedLibrary?.id

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
    defaultValues: {
      task_library_id: resolvedLibraryId ? String(resolvedLibraryId) : '',
      due_date: defaultDate ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        task_library_id: resolvedLibraryId ? String(resolvedLibraryId) : '',
        due_date: defaultDate ?? '',
        assigned_to: '',
      })
    }
  }, [open, resolvedLibraryId, defaultDate, reset])

  const mutation = useMutation({
    mutationFn: (values: ScheduleFormValues) =>
      scheduleTaskLibrary(Number(values.task_library_id), {
        due_date: values.due_date,
        assigned_to: values.assigned_to ? Number(values.assigned_to) : null,
      }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success('WO PM Schedule berhasil dijadwalkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menjadwalkan.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jadwalkan WO PM</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Kegiatan PM (Task Library)</Label>
            {lockedLibrary ? (
              <p className="rounded-lg border border-input px-2.5 py-2 text-sm">
                {lockedLibrary.title} — {lockedLibrary.equipment_name}
              </p>
            ) : (
              <Controller
                control={control}
                name="task_library_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kegiatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {libraries.map((library) => (
                        <SelectItem key={library.id} value={String(library.id)}>
                          {library.title} — {library.equipment_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.task_library_id && (
              <p className="text-sm text-destructive">{errors.task_library_id.message}</p>
            )}
          </div>
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
