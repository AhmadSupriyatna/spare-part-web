import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Gauge, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { taskLibraryMaintenanceCategoryOptions } from '@/features/task-libraries/maintenanceCategory'
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
const maintenanceCategorySchema = z.enum(['life_time', 'scheduled_maintenance', 'inspection'])

const taskLibrarySchema = z
  .object({
    title: z.string().min(1, 'Nama kegiatan wajib diisi').max(255),
    description: z.string().optional(),
    // No default here on purpose — mirrors Part's replacement_strategy:
    // there's no safe default among the 3 categories, so a new recipe
    // starts unselected and must be chosen explicitly.
    maintenance_category: maintenanceCategorySchema,
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

/** Clamps to a valid quantity (integer >= 1) — never lets a bad keystroke stage a 0/negative/decimal value. */
function sanitizeQuantity(value: string): number {
  const parsed = Math.trunc(Number(value))
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
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
 * the checklist of parts to work on (each with its own quantity — how many
 * physical units of that part this recipe replaces, see
 * PmSchedulingService::schedule() which turns quantity_required into that
 * many independent TaskPartCheck rows), picked only from what's actually
 * installed on this equipment. Creating submits everything — including the
 * chosen parts and quantities — in one atomic request; editing keeps the
 * parts checklist incremental (quantity is set once, at add time, since
 * there's no update-quantity endpoint — only add/remove), and a newly
 * picked part is staged with an editable quantity before it's actually
 * sent, rather than firing immediately like a plain toggle.
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

  // partId -> quantity. Create mode: every part the user has picked,
  // submitted together with the rest of the form. Edit mode: parts picked
  // but not yet sent — each gets its own "Tambah" once its quantity is set.
  const [stagedParts, setStagedParts] = useState<Map<number, number>>(new Map())

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
      maintenance_category: library?.maintenance_category ?? undefined,
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
        maintenance_category: library?.maintenance_category ?? undefined,
        schedule_type: library?.schedule_type ?? 'none',
        calendar_interval: calendarIntervalFromDays(library?.interval_days ?? null),
        interval_hours: library?.interval_hours ? String(library.interval_hours) : '',
        estimated_duration_minutes: library?.estimated_duration_minutes ? String(library.estimated_duration_minutes) : '',
      })
      setStagedParts(new Map())
    }
  }, [open, library, reset])

  const scheduleType = watch('schedule_type')
  const maintenanceCategory = watch('maintenance_category')
  const selectedCategoryOption = taskLibraryMaintenanceCategoryOptions.find((o) => o.value === maintenanceCategory)

  const mutation = useMutation({
    mutationFn: (values: TaskLibraryFormValues) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        maintenance_category: values.maintenance_category,
        schedule_type: values.schedule_type === 'none' ? null : values.schedule_type,
        interval_days:
          values.schedule_type === 'calendar' ? (values.calendar_interval === 'weekly' ? 7 : 30) : null,
        interval_hours: values.schedule_type === 'runtime' ? Number(values.interval_hours) : null,
        estimated_duration_minutes: values.estimated_duration_minutes ? Number(values.estimated_duration_minutes) : null,
      }
      if (isEdit) return updateTaskLibrary(library!.id, payload)

      const parts: TaskLibraryPartInput[] = Array.from(stagedParts.entries()).map(([partId, quantity]) => ({
        part_id: partId,
        quantity_required: quantity,
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
    mutationFn: ({ partId, quantity }: { partId: number; quantity: number }) =>
      addTaskLibraryPart(library!.id, { part_id: partId, quantity_required: quantity }),
    onSuccess: (_data, { partId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      setStagedParts((prev) => {
        const next = new Map(prev)
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
    setStagedParts((prev) => new Map(prev).set(partId, 1))
  }

  function unstagePart(partId: number) {
    setStagedParts((prev) => {
      const next = new Map(prev)
      next.delete(partId)
      return next
    })
  }

  function setStagedQuantity(partId: number, quantity: number) {
    setStagedParts((prev) => new Map(prev).set(partId, quantity))
  }

  const alreadyAddedParts = new Map(library?.parts.map((p) => [p.part_id, p]) ?? [])
  const pickablePartIds = new Set(installedParts.map((p) => p.partId))
  const availableParts = installedParts.filter(
    (part) => !alreadyAddedParts.has(part.partId) && !stagedParts.has(part.partId),
  )

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Task Library' : 'Tambah Task Library'}
      description="Resep kegiatan PM — interval di sini hanya metadata untuk otomasi ke depan, penjadwalan tanggal aktual tetap dilakukan lewat PM Schedule."
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty || stagedParts.size > 0}
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
        <Label>Kategori Maintenance</Label>
        <p className="-mt-1 text-xs text-muted-foreground">
          Jenis kegiatan PM ini — terpisah dari interval di bawah, dan tidak menentukan jadwalnya secara paksa.
        </p>
        <Controller
          control={control}
          name="maintenance_category"
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {taskLibraryMaintenanceCategoryOptions.map((option) => {
                const Icon = option.icon
                const selected = field.value === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors select-none hover:border-primary/50 hover:bg-muted',
                      selected && 'border-primary bg-primary/5',
                    )}
                  >
                    <Icon className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.maintenance_category && (
          <p className="text-sm text-destructive">Pilih salah satu kategori maintenance.</p>
        )}
        {selectedCategoryOption && (
          <p className="text-xs text-muted-foreground italic">{selectedCategoryOption.scheduleHint}</p>
        )}
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
            Berapa unit fisik part ini yang akan diganti setiap kali kegiatan ini dikerjakan.
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

        {stagedParts.size > 0 && (
          <div className="flex flex-col gap-1.5">
            {Array.from(stagedParts.entries()).map(([partId, quantity]) => {
              const part = installedParts.find((p) => p.partId === partId)
              if (!part) return null
              const adding = isEdit && addPartMutation.isPending && addPartMutation.variables?.partId === partId
              return (
                <div key={partId} className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{part.partName}</span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    disabled={adding}
                    onChange={(e) => setStagedQuantity(partId, sanitizeQuantity(e.target.value))}
                    className="h-8 w-16 text-center"
                    aria-label={`Quantity ${part.partName}`}
                  />
                  {isEdit && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={adding}
                      onClick={() => addPartMutation.mutate({ partId, quantity })}
                    >
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
