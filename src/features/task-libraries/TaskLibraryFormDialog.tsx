import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Gauge, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchPartInstallations } from '@/features/part-installations/api'
import {
  addTaskLibraryPart,
  createTaskLibrary,
  removeTaskLibraryPart,
  updateTaskLibrary,
  type TaskLibraryPartInput,
} from '@/features/task-libraries/api'
import type { TaskLibrary } from '@/types/pm'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const scheduleTypeSchema = z.enum(['none', 'calendar', 'runtime'])
const calendarIntervalSchema = z.enum(['weekly', 'monthly'])

const taskLibrarySchema = z
  .object({
    title: z.string().min(1, 'Nama kegiatan wajib diisi').max(255),
    description: z.string().optional(),
    schedule_type: scheduleTypeSchema,
    calendar_interval: calendarIntervalSchema.optional(),
    interval_hours: z.string().optional(),
    estimated_duration_minutes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.schedule_type === 'calendar' && !data.calendar_interval) {
      ctx.addIssue({ code: 'custom', path: ['calendar_interval'], message: 'Pilih Mingguan atau Bulanan' })
    }
    if (data.schedule_type === 'runtime' && !(Number.isInteger(Number(data.interval_hours)) && Number(data.interval_hours) >= 1)) {
      ctx.addIssue({ code: 'custom', path: ['interval_hours'], message: 'Wajib diisi, minimal 1 jam' })
    }
    if (
      data.estimated_duration_minutes &&
      !(Number.isInteger(Number(data.estimated_duration_minutes)) && Number(data.estimated_duration_minutes) >= 1)
    ) {
      ctx.addIssue({ code: 'custom', path: ['estimated_duration_minutes'], message: 'Harus angka bulat, minimal 1' })
    }
  })

type TaskLibraryFormValues = z.infer<typeof taskLibrarySchema>

function calendarIntervalFromDays(days: number | null): 'weekly' | 'monthly' | undefined {
  if (days === 7) return 'weekly'
  if (days === 30) return 'monthly'
  return undefined
}

interface InstalledPartOption {
  partId: number
  partName: string
  itemMasterNo: string
  /** How many active units of this part are installed on this equipment — the checklist quantity is always exactly this, never a typed-in number. */
  installedCount: number
}

function summarizeInstalledParts(
  installations: { part_id: number; part_name: string; item_master_no: string; is_active: boolean }[] | undefined,
): InstalledPartOption[] {
  const byPart = new Map<number, InstalledPartOption>()
  for (const installation of installations ?? []) {
    if (!installation.is_active) continue
    const existing = byPart.get(installation.part_id)
    if (existing) {
      existing.installedCount += 1
      continue
    }
    byPart.set(installation.part_id, {
      partId: installation.part_id,
      partName: installation.part_name,
      itemMasterNo: installation.item_master_no,
      installedCount: 1,
    })
  }
  return Array.from(byPart.values())
}

interface TaskLibraryFormDialogProps {
  equipmentId: number
  library?: TaskLibrary
  trigger: React.ReactNode
}

/**
 * The single "laci input" for a Task Library (PM recipe): identity fields,
 * the calendar-vs-running-hours interval (metadata only — nothing here
 * actually schedules a due date, that stays PM Schedule's job later), and
 * the checklist of parts to work on, picked only from what's actually
 * installed on this equipment. Quantity is never typed in — it's always
 * however many units of that part are currently installed (computed
 * server-side, see Equipment::activeInstallationCountForPart(), which
 * PmSchedulingService::schedule() then turns into that many independent
 * TaskPartCheck rows), so a PM checklist always covers every installed unit
 * rather than some number a user might mistype. Creating submits everything
 * — including the chosen parts — in one atomic request; editing keeps the
 * parts checklist incremental (add/remove only, no quantity to set), and a
 * newly picked part is staged before it's actually sent, rather than firing
 * immediately like a plain toggle.
 */
export function TaskLibraryFormDialog({ equipmentId, library, trigger }: TaskLibraryFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(library)

  const { data: installations } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
    enabled: open,
  })
  const installedParts = useMemo(() => summarizeInstalledParts(installations), [installations])

  // Create mode: every part the user has picked, submitted together with
  // the rest of the form. Edit mode: parts picked but not yet sent — each
  // gets its own "Tambah".
  const [stagedPartIds, setStagedPartIds] = useState<Set<number>>(new Set())

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<TaskLibraryFormValues>({
    resolver: zodResolver(taskLibrarySchema),
    defaultValues: {
      title: library?.title ?? '',
      description: library?.description ?? '',
      schedule_type: library?.schedule_type ?? 'none',
      calendar_interval: calendarIntervalFromDays(library?.interval_days ?? null),
      interval_hours: library?.interval_hours ? String(library.interval_hours) : '',
      estimated_duration_minutes: library?.estimated_duration_minutes ? String(library.estimated_duration_minutes) : '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: library?.title ?? '',
        description: library?.description ?? '',
        schedule_type: library?.schedule_type ?? 'none',
        calendar_interval: calendarIntervalFromDays(library?.interval_days ?? null),
        interval_hours: library?.interval_hours ? String(library.interval_hours) : '',
        estimated_duration_minutes: library?.estimated_duration_minutes ? String(library.estimated_duration_minutes) : '',
      })
      setStagedPartIds(new Set())
    }
  }, [open, library, reset])

  const scheduleType = watch('schedule_type')

  const mutation = useMutation({
    mutationFn: (values: TaskLibraryFormValues) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        schedule_type: values.schedule_type === 'none' ? null : values.schedule_type,
        interval_days:
          values.schedule_type === 'calendar' ? (values.calendar_interval === 'weekly' ? 7 : 30) : null,
        interval_hours: values.schedule_type === 'runtime' ? Number(values.interval_hours) : null,
        estimated_duration_minutes: values.estimated_duration_minutes ? Number(values.estimated_duration_minutes) : null,
      }
      if (isEdit) return updateTaskLibrary(library!.id, payload)

      const parts: TaskLibraryPartInput[] = Array.from(stagedPartIds).map((partId) => ({ part_id: partId }))
      return createTaskLibrary(equipmentId, { ...payload, parts })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success(isEdit ? 'Task Library berhasil diperbarui.' : 'Task Library berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan Task Library.'),
  })

  const addPartMutation = useMutation({
    mutationFn: (partId: number) => addTaskLibraryPart(library!.id, { part_id: partId }),
    onSuccess: (_data, partId) => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      setStagedPartIds((prev) => {
        const next = new Set(prev)
        next.delete(partId)
        return next
      })
    },
    onError: () => toast.error('Gagal menambahkan part ke checklist.'),
  })

  const removePartMutation = useMutation({
    mutationFn: removeTaskLibraryPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
    },
    onError: () => toast.error('Gagal menghapus part dari checklist.'),
  })

  function stagePart(partId: number) {
    setStagedPartIds((prev) => new Set(prev).add(partId))
  }

  function unstagePart(partId: number) {
    setStagedPartIds((prev) => {
      const next = new Set(prev)
      next.delete(partId)
      return next
    })
  }

  const alreadyAddedParts = new Map(library?.parts.map((p) => [p.part_id, p]) ?? [])
  const pickablePartIds = new Set(installedParts.map((p) => p.partId))
  const availableParts = installedParts.filter(
    (part) => !alreadyAddedParts.has(part.partId) && !stagedPartIds.has(part.partId),
  )

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Task Library' : 'Tambah Task Library'}
      description="Resep kegiatan PM — interval di sini hanya metadata untuk otomasi ke depan, penjadwalan tanggal aktual tetap dilakukan lewat PM Schedule."
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty || stagedPartIds.size > 0}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label>Kode Task</Label>
        <Input disabled value={library?.code ?? 'Dibuat otomatis setelah disimpan'} className="font-mono text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Kegiatan</Label>
        <Input id="title" placeholder="Ganti Oli & Filter" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Interval Pekerjaan</Label>
        <Controller
          control={control}
          name="schedule_type"
          render={({ field }) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => field.onChange(field.value === 'calendar' ? 'none' : 'calendar')}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-md border p-3 text-xs font-medium transition-colors',
                  field.value === 'calendar' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Calendar className="size-5" />
                Kalender
              </button>
              <button
                type="button"
                onClick={() => field.onChange(field.value === 'runtime' ? 'none' : 'runtime')}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-md border p-3 text-xs font-medium transition-colors',
                  field.value === 'runtime' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Gauge className="size-5" />
                Running Hours Mesin
              </button>
            </div>
          )}
        />

        {scheduleType === 'calendar' && (
          <Controller
            control={control}
            name="calendar_interval"
            render={({ field }) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => field.onChange('weekly')}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    field.value === 'weekly' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  Mingguan
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('monthly')}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    field.value === 'monthly' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  Bulanan
                </button>
              </div>
            )}
          />
        )}
        {scheduleType === 'runtime' && (
          <div className="flex items-center gap-2">
            <Input id="interval_hours" type="number" min={1} placeholder="500" {...register('interval_hours')} />
            <span className="shrink-0 text-sm text-muted-foreground">jam operasi mesin sekali</span>
          </div>
        )}
        {errors.calendar_interval && <p className="text-sm text-destructive">{errors.calendar_interval.message}</p>}
        {errors.interval_hours && <p className="text-sm text-destructive">{errors.interval_hours.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="estimated_duration_minutes">Durasi Pekerjaan</Label>
        <div className="flex items-center gap-2">
          <Input id="estimated_duration_minutes" type="number" min={1} placeholder="60" {...register('estimated_duration_minutes')} />
          <span className="shrink-0 text-sm text-muted-foreground">menit</span>
        </div>
        {errors.estimated_duration_minutes && (
          <p className="text-sm text-destructive">{errors.estimated_duration_minutes.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea id="description" placeholder="Detail langkah kerja (opsional)" {...register('description')} />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <Label>Part & Quantity</Label>
          <p className="text-xs text-muted-foreground">
            Quantity otomatis mengikuti jumlah unit part yang sedang terpasang di equipment ini — bukan angka yang
            diketik manual.
          </p>
        </div>

        {isEdit && alreadyAddedParts.size > 0 && (
          <div className="flex flex-col gap-1.5">
            {Array.from(alreadyAddedParts.values()).map((part) => (
              <div key={part.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">
                  {part.part_name} <span className="text-muted-foreground">× {part.quantity_required}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${part.part_name}`}
                  disabled={removePartMutation.isPending && removePartMutation.variables === part.id}
                  onClick={() => removePartMutation.mutate(part.id)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        )}

        {stagedPartIds.size > 0 && (
          <div className="flex flex-col gap-1.5">
            {Array.from(stagedPartIds).map((partId) => {
              const part = installedParts.find((p) => p.partId === partId)
              if (!part) return null
              const adding = isEdit && addPartMutation.isPending && addPartMutation.variables === partId
              return (
                <div key={partId} className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{part.partName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Terpasang: <span className="font-medium text-foreground">{part.installedCount}</span> unit
                  </span>
                  {isEdit && (
                    <Button type="button" size="sm" disabled={adding} onClick={() => addPartMutation.mutate(partId)}>
                      {adding ? '...' : 'Tambah'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Batalkan ${part.partName}`}
                    disabled={adding}
                    onClick={() => unstagePart(partId)}
                  >
                    <X />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {availableParts.length === 0 && pickablePartIds.size === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada part terpasang di equipment ini.</p>
        ) : (
          availableParts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Tap part untuk menambahkan ke checklist ini.</p>
              {availableParts.map((part) => (
                <button
                  key={part.partId}
                  type="button"
                  onClick={() => stagePart(part.partId)}
                  className="flex flex-col items-start rounded-md border p-2 text-left text-muted-foreground transition-colors hover:bg-muted"
                >
                  <span className="block truncate text-sm font-medium">{part.partName}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{part.itemMasterNo}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </FormSheet>
  )
}
