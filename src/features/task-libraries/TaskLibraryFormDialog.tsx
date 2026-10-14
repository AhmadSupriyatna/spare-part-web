import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Gauge, Hand, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchPartInstallations } from '@/features/part-installations/api'
import {
  addTaskLibraryChecklistItem,
  addTaskLibraryPart,
  createTaskLibrary,
  removeTaskLibraryChecklistItem,
  removeTaskLibraryPart,
  updateTaskLibrary,
  updateTaskLibraryPartChecklistItem,
  type TaskLibraryChecklistItemInput,
} from '@/features/task-libraries/api'
import type { TaskLibrary } from '@/types/pm'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

function showSaveError(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string; errors?: Record<string, unknown> } } }).response
  const validationMessages = Object.values(response?.data?.errors ?? {}).flatMap((value) =>
    Array.isArray(value) ? value.filter((message): message is string => typeof message === 'string') : [],
  )
  toast.error(response?.data?.message ?? validationMessages[0] ?? fallback)
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
 * condition checks and their related parts, picked only from what's
 * installed on this equipment. Quantity is never typed in — it's always
 * however many units of that part are currently installed (computed
 * server-side, see Equipment::activeInstallationCountForPart(), which
 * PmSchedulingService::schedule() then turns into that many independent
 * TaskPartCheck rows), so a PM checklist always covers every installed unit
 * rather than some number a user might mistype. Creating submits everything
 * in one atomic request; editing keeps checklist changes incremental, and a
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

  const [stagedPartIdsByCondition, setStagedPartIdsByCondition] = useState<Record<number, Set<number>>>({})
  const [selectedConditionByPart, setSelectedConditionByPart] = useState<Record<number, number>>({})

  // Keyed by a local tempId because two condition checks may share a description.
  const [checklistDraft, setChecklistDraft] = useState('')
  const [stagedChecklistItems, setStagedChecklistItems] = useState<
    { tempId: number; description: string; partIds: Set<number> }[]
  >([])
  const nextChecklistTempId = useRef(0)

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
      setStagedPartIdsByCondition({})
      setSelectedConditionByPart({})
      setStagedChecklistItems([])
      setChecklistDraft('')
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

      const checklistItems: TaskLibraryChecklistItemInput[] = stagedChecklistItems.map((item) => ({
        description: item.description,
        parts: Array.from(item.partIds).map((part_id) => ({ part_id })),
      }))
      return createTaskLibrary(equipmentId, { ...payload, checklist_items: checklistItems })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success(isEdit ? 'Task Library berhasil diperbarui.' : 'Task Library berhasil ditambahkan.')
      setOpen(false)
    },
    onError: (error: unknown) => showSaveError(error, 'Gagal menyimpan Task Library.'),
  })

  const addPartMutation = useMutation({
    mutationFn: ({ partId, checklistItemId }: { partId: number; checklistItemId: number }) =>
      addTaskLibraryPart(library!.id, {
        part_id: partId,
        task_library_checklist_item_id: checklistItemId,
      }),
    onSuccess: (_data, { partId, checklistItemId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      setStagedPartIdsByCondition((prev) => {
        const next = new Set(prev[checklistItemId] ?? [])
        next.delete(partId)
        return { ...prev, [checklistItemId]: next }
      })
    },
    onError: (error: unknown) => showSaveError(error, 'Gagal menambahkan part ke checklist.'),
  })

  const removePartMutation = useMutation({
    mutationFn: removeTaskLibraryPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
    },
    onError: () => toast.error('Gagal menghapus part dari checklist.'),
  })

  const movePartMutation = useMutation({
    mutationFn: ({ partId, checklistItemId }: { partId: number; checklistItemId: number }) =>
      updateTaskLibraryPartChecklistItem(partId, checklistItemId),
    onSuccess: (_data, { partId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      setSelectedConditionByPart((prev) => {
        const next = { ...prev }
        delete next[partId]
        return next
      })
    },
    onError: (error: unknown) => showSaveError(error, 'Gagal mengaitkan part ke pengecekan kondisi.'),
  })

  const addChecklistItemMutation = useMutation({
    mutationFn: (item: { tempId: number; description: string }) =>
      addTaskLibraryChecklistItem(library!.id, { description: item.description }),
    onSuccess: (_data, item) => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      setStagedChecklistItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
    },
    onError: (error: unknown) => showSaveError(error, 'Gagal menambahkan item checklist.'),
  })

  const removeChecklistItemMutation = useMutation({
    mutationFn: removeTaskLibraryChecklistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
    },
    onError: () => toast.error('Gagal menghapus item checklist.'),
  })

  function stageChecklistDescription() {
    const description = checklistDraft.trim()
    if (!description) return
    setStagedChecklistItems((prev) => [...prev, { tempId: nextChecklistTempId.current++, description, partIds: new Set() }])
    setChecklistDraft('')
  }

  function unstageChecklistItem(tempId: number) {
    setStagedChecklistItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  function stagePart(conditionItemId: number, partId: number) {
    setStagedPartIdsByCondition((prev) => {
      const next = new Set(prev[conditionItemId] ?? [])
      next.add(partId)
      return { ...prev, [conditionItemId]: next }
    })
  }

  function unstagePart(conditionItemId: number, partId: number) {
    setStagedPartIdsByCondition((prev) => {
      const next = new Set(prev[conditionItemId] ?? [])
      next.delete(partId)
      return { ...prev, [conditionItemId]: next }
    })
  }

  const alreadyAddedParts = new Map(library?.parts.map((p) => [p.part_id, p]) ?? [])
  const pickablePartIds = new Set(installedParts.map((p) => p.partId))
  const stagedPartIds = new Set(Object.values(stagedPartIdsByCondition).flatMap((ids) => Array.from(ids)))
  const availablePartsFor = (conditionItemId: number) =>
    installedParts.filter(
      (part) =>
        !alreadyAddedParts.has(part.partId) &&
        !stagedPartIds.has(part.partId) &&
        !(stagedPartIdsByCondition[conditionItemId]?.has(part.partId) ?? false),
    )

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Task Library' : 'Tambah Task Library'}
      description="Resep kegiatan PM — interval di sini hanya metadata untuk otomasi ke depan, penjadwalan tanggal aktual tetap dilakukan lewat PM Schedule."
      open={open}
      onOpenChange={setOpen}
      isDirty={
        isDirty ||
        stagedPartIds.size > 0 ||
        stagedChecklistItems.length > 0 ||
        Object.keys(selectedConditionByPart).length > 0
      }
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
        <p className="text-xs text-muted-foreground">
          Kalender/Running Hours membuat WO terjadwal otomatis berulang. Manual tidak — dijadwalkan sendiri kapan
          perlu lewat menu PM Schedule.
        </p>
        <Controller
          control={control}
          name="schedule_type"
          render={({ field }) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => field.onChange('none')}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-md border p-3 text-xs font-medium transition-colors',
                  field.value === 'none' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Hand className="size-5" />
                Manual
              </button>
              <button
                type="button"
                onClick={() => field.onChange('calendar')}
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
                onClick={() => field.onChange('runtime')}
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
          <Label>Checklist Kondisi</Label>
          <p className="text-xs text-muted-foreground">
            Buat pemeriksaan kondisi terlebih dahulu, lalu pilih part yang perlu diperiksa atau diganti jika hasilnya Tidak.
            Jumlah part mengikuti unit yang terpasang.
          </p>
        </div>

        {isEdit &&
          library!.checklist_items.map((item) => {
            const stagedIds = stagedPartIdsByCondition[item.id] ?? new Set<number>()
            const availableParts = availablePartsFor(item.id)
            return (
              <div key={item.id} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 font-medium">{item.description}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${item.description}`}
                    disabled={removeChecklistItemMutation.isPending && removeChecklistItemMutation.variables === item.id}
                    onClick={() => removeChecklistItemMutation.mutate(item.id)}
                  >
                    <X />
                  </Button>
                </div>
                {(item.parts ?? []).map((part) => (
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
                {Array.from(stagedIds).map((partId) => {
                  const part = installedParts.find((candidate) => candidate.partId === partId)
                  if (!part) return null
                  const adding =
                    addPartMutation.isPending &&
                    addPartMutation.variables?.partId === partId &&
                    addPartMutation.variables?.checklistItemId === item.id
                  return (
                    <div key={partId} className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{part.partName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">Terpasang: {part.installedCount}</span>
                      <Button type="button" size="sm" disabled={adding} onClick={() => addPartMutation.mutate({ partId, checklistItemId: item.id })}>
                        {adding ? '...' : 'Tambah'}
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Batalkan ${part.partName}`} onClick={() => unstagePart(item.id, partId)}>
                        <X />
                      </Button>
                    </div>
                  )
                })}
                {availableParts.map((part) => (
                  <button
                    key={part.partId}
                    type="button"
                    onClick={() => stagePart(item.id, part.partId)}
                    className="flex flex-col items-start rounded-md border p-2 text-left text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{part.partName}</span>
                    <span className="font-mono text-xs">{part.itemMasterNo} · Terpasang: {part.installedCount}</span>
                  </button>
                ))}
                {item.parts.length === 0 && stagedIds.size === 0 && availableParts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {pickablePartIds.size === 0 ? 'Belum ada part terpasang di equipment ini.' : 'Semua part terpasang sudah dikaitkan.'}
                  </p>
                )}
              </div>
            )
          })}

        {isEdit && library!.parts.some((part) => part.task_library_checklist_item_id == null) && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">Part belum dikaitkan ke kondisi</p>
            <p className="text-xs text-muted-foreground">Pilih kondisi untuk memindahkan data Task Library lama ke dalam pengecekan yang sesuai.</p>
            {library!.checklist_items.length === 0 && (
              <p className="text-xs text-warning">Tambahkan dan simpan pengecekan kondisi terlebih dahulu.</p>
            )}
            {library!.parts
              .filter((part) => part.task_library_checklist_item_id == null)
              .map((part) => (
                <div key={part.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {part.part_name} × {part.quantity_required}
                  </span>
                  <Select
                    value={selectedConditionByPart[part.id]?.toString() ?? null}
                    disabled={library!.checklist_items.length === 0}
                    onValueChange={(value) =>
                      value && setSelectedConditionByPart((prev) => ({ ...prev, [part.id]: Number(value) }))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Pilih kondisi" />
                    </SelectTrigger>
                    <SelectContent>
                      {library!.checklist_items.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>{item.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      library!.checklist_items.length === 0 ||
                      !selectedConditionByPart[part.id] ||
                      movePartMutation.isPending
                    }
                    onClick={() => {
                      const checklistItemId = selectedConditionByPart[part.id]
                      if (checklistItemId) movePartMutation.mutate({ partId: part.id, checklistItemId })
                    }}
                  >
                    Pindahkan
                  </Button>
                </div>
              ))}
          </div>
        )}

        {!isEdit &&
          stagedChecklistItems.map((item) => {
            const selectedPartIds = new Set(stagedChecklistItems.flatMap((entry) => Array.from(entry.partIds)))
            const availableParts = installedParts.filter((part) => !selectedPartIds.has(part.partId))
            return (
              <div key={item.tempId} className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 font-medium">{item.description}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Batalkan ${item.description}`} onClick={() => unstageChecklistItem(item.tempId)}>
                    <X />
                  </Button>
                </div>
                {Array.from(item.partIds).map((partId) => {
                  const part = installedParts.find((candidate) => candidate.partId === partId)
                  if (!part) return null
                  return (
                    <div key={partId} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5 text-sm">
                      <span>{part.partName} × {part.installedCount}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus ${part.partName}`}
                        onClick={() =>
                          setStagedChecklistItems((prev) =>
                            prev.map((entry) =>
                              entry.tempId === item.tempId
                                ? { ...entry, partIds: new Set(Array.from(entry.partIds).filter((id) => id !== partId)) }
                                : entry,
                            ),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  )
                })}
                {availableParts.map((part) => (
                  <button
                    key={part.partId}
                    type="button"
                    onClick={() =>
                      setStagedChecklistItems((prev) =>
                        prev.map((entry) =>
                          entry.tempId === item.tempId ? { ...entry, partIds: new Set(entry.partIds).add(part.partId) } : entry,
                        ),
                      )
                    }
                    className="flex flex-col items-start rounded-md border bg-background p-2 text-left text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{part.partName}</span>
                    <span className="font-mono text-xs">{part.itemMasterNo} · Terpasang: {part.installedCount}</span>
                  </button>
                ))}
              </div>
            )
          })}

        {stagedChecklistItems.length > 0 && isEdit && (
          <div className="flex flex-col gap-1.5">
            {stagedChecklistItems.map((item) => {
              const adding =
                addChecklistItemMutation.isPending &&
                addChecklistItemMutation.variables?.tempId === item.tempId
              return (
                <div key={item.tempId} className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{item.description}</span>
                  <Button type="button" size="sm" disabled={adding} onClick={() => addChecklistItemMutation.mutate(item)}>
                    {adding ? '...' : 'Tambah Kondisi'}
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Batalkan ${item.description}`} onClick={() => unstageChecklistItem(item.tempId)}>
                    <X />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Mis. Periksa kebocoran"
            value={checklistDraft}
            onChange={(e) => setChecklistDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                stageChecklistDescription()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={stageChecklistDescription}>
            Tambah
          </Button>
        </div>
      </div>
    </FormSheet>
  )
}
