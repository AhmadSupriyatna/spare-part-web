import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Gauge, Trash2 } from 'lucide-react'
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
import { FormSheet } from '@/components/FormSheet'
import { Checkbox } from '@/components/ui/checkbox'
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
}

function dedupeInstalledParts(
  installations: { part_id: number; part_name: string; item_master_no: string; is_active: boolean }[] | undefined,
): InstalledPartOption[] {
  const seen = new Map<number, InstalledPartOption>()
  for (const installation of installations ?? []) {
    if (!installation.is_active || seen.has(installation.part_id)) continue
    seen.set(installation.part_id, {
      partId: installation.part_id,
      partName: installation.part_name,
      itemMasterNo: installation.item_master_no,
    })
  }
  return Array.from(seen.values())
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
 * installed on this equipment. Creating submits everything — including the
 * chosen parts — in one atomic request; editing keeps the parts checklist
 * incremental, and tapping an installed part adds it immediately (no
 * separate confirm button, for speed on a shop-floor tablet).
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
  const installedParts = useMemo(() => dedupeInstalledParts(installations), [installations])

  // Create-only: parts staged locally until the whole form is submitted together.
  const [stagedParts, setStagedParts] = useState<Record<number, { needs_replacement: boolean }>>({})
  // Edit-only: needs_replacement chosen before tapping an addable part to add it immediately.
  const [pendingNeedsReplacement, setPendingNeedsReplacement] = useState<Record<number, boolean>>({})

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
      setStagedParts({})
      setPendingNeedsReplacement({})
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

      const parts: TaskLibraryPartInput[] = Object.entries(stagedParts).map(([partId, config]) => ({
        part_id: Number(partId),
        needs_replacement: config.needs_replacement,
      }))
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
    mutationFn: ({ partId, needsReplacement }: { partId: number; needsReplacement: boolean }) =>
      addTaskLibraryPart(library!.id, { part_id: partId, needs_replacement: needsReplacement }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success('Part berhasil ditambahkan ke checklist.')
    },
    onError: () => toast.error('Gagal menambahkan part ke checklist.'),
  })

  const removePartMutation = useMutation({
    mutationFn: removeTaskLibraryPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success('Part berhasil dihapus dari checklist.')
    },
  })

  function toggleStagedPart(partId: number, checked: boolean) {
    setStagedParts((prev) => {
      const next = { ...prev }
      if (checked) next[partId] = { needs_replacement: false }
      else delete next[partId]
      return next
    })
  }

  const alreadyAddedPartIds = new Set(library?.parts.map((p) => p.part_id) ?? [])
  const addablePartsForEdit = installedParts.filter((p) => !alreadyAddedPartIds.has(p.partId))

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Task Library' : 'Tambah Task Library'}
      description="Resep kegiatan PM — interval di sini hanya metadata untuk otomasi ke depan, penjadwalan tanggal aktual tetap dilakukan lewat PM Schedule."
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty || Object.keys(stagedParts).length > 0}
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

      <div className="flex flex-col gap-2">
        <Label>Part Terkait</Label>
        {installedParts.length === 0 && !isEdit && (
          <p className="text-sm text-muted-foreground">Belum ada part terpasang di equipment ini.</p>
        )}

        {!isEdit &&
          installedParts.map((part) => {
            const staged = stagedParts[part.partId]
            const checked = Boolean(staged)
            return (
              <div key={part.partId} className="flex items-center gap-2 rounded-md border p-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <Checkbox checked={checked} onCheckedChange={(v) => toggleStagedPart(part.partId, v === true)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{part.partName}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">{part.itemMasterNo}</span>
                  </span>
                </label>
                {checked && (
                  <label className="flex shrink-0 items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={staged.needs_replacement}
                      onCheckedChange={(v) =>
                        setStagedParts((prev) => ({ ...prev, [part.partId]: { needs_replacement: v === true } }))
                      }
                    />
                    Perlu Penggantian
                  </label>
                )}
              </div>
            )
          })}

        {isEdit && (
          <div className="flex flex-col gap-3">
            {library!.parts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada part di checklist ini.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {library!.parts.map((part) => (
                  <li key={part.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {part.part_name}{' '}
                      <span className="font-mono text-xs text-muted-foreground">({part.item_master_no})</span>
                    </span>
                    {part.needs_replacement && (
                      <span className="shrink-0 text-xs text-muted-foreground">Perlu Penggantian</span>
                    )}
                    <button
                      type="button"
                      aria-label="Hapus dari checklist"
                      title="Hapus dari checklist"
                      onClick={() => removePartMutation.mutate(part.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {addablePartsForEdit.length > 0 && (
              <div className="flex flex-col gap-2 border-t pt-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tap part untuk menambah ke checklist
                </p>
                {addablePartsForEdit.map((part) => {
                  const needsReplacement = pendingNeedsReplacement[part.partId] ?? false
                  return (
                    <div key={part.partId} className="flex items-center gap-2 rounded-md border p-2">
                      <button
                        type="button"
                        disabled={addPartMutation.isPending}
                        onClick={() => addPartMutation.mutate({ partId: part.partId, needsReplacement })}
                        className="flex min-w-0 flex-1 flex-col items-start text-left disabled:opacity-50"
                      >
                        <span className="truncate text-sm font-medium">{part.partName}</span>
                        <span className="truncate font-mono text-xs text-muted-foreground">{part.itemMasterNo}</span>
                      </button>
                      <label className="flex shrink-0 items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={needsReplacement}
                          onCheckedChange={(v) =>
                            setPendingNeedsReplacement((prev) => ({ ...prev, [part.partId]: v === true }))
                          }
                        />
                        Perlu Penggantian
                      </label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </FormSheet>
  )
}
