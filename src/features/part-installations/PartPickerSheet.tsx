import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, GripVertical, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { installPart } from '@/features/part-installations/api'
import { fetchUnitsForPart } from '@/features/part-units/api'
import { fetchParts } from '@/features/parts/api'
import type { Part } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

const NEW_PART_VALUE = 'new'

const confirmInstallSchema = z.object({
  part_unit_id: z.string().min(1, 'Pilih part baru/bekas'),
  installed_at: z.string().optional(),
  notes: z.string().optional(),
})

type ConfirmInstallValues = z.infer<typeof confirmInstallSchema>

interface PartPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: number
  equipmentName?: string
  /** A part chosen by dropping it on the floating drop zone outside the sheet. */
  droppedPart: Part | null
  onDropHandled: () => void
  onDragStartPart: (part: Part) => void
  onDragEndPart: () => void
}

function groupByCategory(parts: Part[]): [string, Part[]][] {
  const groups = new Map<string, Part[]>()
  for (const part of parts) {
    const key = part.category ?? 'Tanpa Kategori'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(part)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

/**
 * Right-side drawer for installing a part — one panel, two steps, so
 * picking a part never pops a second dialog on top of it (that felt
 * jarring). Step 1: parts grouped by category, draggable (and clickable,
 * since native HTML5 drag-and-drop has no touch equivalent and this runs
 * on shop-floor tablets too) — dragging one onto the floating drop zone
 * in LineHierarchyPage, or clicking it here, moves to step 2. Step 2 asks
 * only what step 1 can't infer: new/used part, install date, notes.
 */
export function PartPickerSheet({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  droppedPart,
  onDropHandled,
  onDragStartPart,
  onDragEndPart,
}: PartPickerSheetProps) {
  const [search, setSearch] = useState('')
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const queryClient = useQueryClient()

  const { data: parts, isLoading } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (parts ?? []).filter(
      (part) => !term || `${part.name} ${part.item_master_no}`.toLowerCase().includes(term),
    )
    return groupByCategory(filtered)
  }, [parts, search])

  useEffect(() => {
    if (!open) {
      setSelectedPart(null)
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    if (droppedPart) {
      setSelectedPart(droppedPart)
      onDropHandled()
    }
  }, [droppedPart, onDropHandled])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfirmInstallValues>({
    resolver: zodResolver(confirmInstallSchema),
    defaultValues: { part_unit_id: NEW_PART_VALUE, installed_at: '', notes: '' },
  })

  useEffect(() => {
    if (selectedPart) reset({ part_unit_id: NEW_PART_VALUE, installed_at: '', notes: '' })
  }, [selectedPart, reset])

  const { data: units } = useQuery({
    queryKey: ['part-units', selectedPart?.id],
    queryFn: () => fetchUnitsForPart(selectedPart!.id),
    enabled: open && !!selectedPart,
  })
  const availableUnits = units?.filter((unit) => unit.status === 'available')

  const mutation = useMutation({
    mutationFn: (values: ConfirmInstallValues) =>
      installPart(equipmentId, {
        part_id: selectedPart!.id,
        part_unit_id: values.part_unit_id === NEW_PART_VALUE ? null : Number(values.part_unit_id),
        installed_at: values.installed_at || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success(`${selectedPart?.name} berhasil dipasang.`)
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memasang part.'
      toast.error(message)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent showOverlay={false}>
        {selectedPart ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Kembali ke daftar part"
                  title="Kembali ke daftar part"
                  onClick={() => setSelectedPart(null)}
                >
                  <ChevronLeft />
                </Button>
                <SheetTitle>Pasang {selectedPart.name}</SheetTitle>
              </div>
              <SheetDescription className="font-mono">{selectedPart.item_master_no}</SheetDescription>
            </SheetHeader>
            <form
              className="flex flex-1 flex-col gap-4 overflow-y-auto"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="installed_at">Tanggal Pasang</Label>
                <Input id="installed_at" type="date" {...register('installed_at')} />
                <p className="text-xs text-muted-foreground">Kosongkan untuk memakai waktu sekarang.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Deskripsi</Label>
                <Textarea id="notes" placeholder="Catatan pemasangan (opsional)" {...register('notes')} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Part Baru/Bekas</Label>
                <Controller
                  control={control}
                  name="part_unit_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NEW_PART_VALUE}>Part Baru</SelectItem>
                        {availableUnits?.map((unit) => (
                          <SelectItem key={unit.id} value={String(unit.id)}>
                            Part Bekas — Unit {unit.unit_code} (sudah dipakai {unit.percent_used ?? 0}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Pilih "Part Baru" kalau ini part yang belum pernah dipasang, atau pilih unit bekas yang sudah
                  selesai diperbaiki untuk dipasang ulang.
                </p>
                {errors.part_unit_id && <p className="text-sm text-destructive">{errors.part_unit_id.message}</p>}
              </div>
              <div className="mt-auto flex justify-end gap-2 border-t pt-4">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Memasang...' : 'Pasang'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Pasang Part{equipmentName ? ` — ${equipmentName}` : ''}</SheetTitle>
              <SheetDescription>
                Seret salah satu part ke kotak "Part" di sebelah kiri untuk memasangnya, atau klik langsung.
              </SheetDescription>
            </SheetHeader>
            <div className="relative shrink-0">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari part..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="-mr-4 flex flex-1 flex-col gap-4 overflow-y-auto pr-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat...</p>
              ) : grouped.length === 0 ? (
                <p className="text-sm text-muted-foreground">Part tidak ditemukan.</p>
              ) : (
                grouped.map(([category, categoryParts]) => (
                  <div key={category} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
                    <div className="flex flex-col gap-1.5">
                      {categoryParts.map((part) => (
                        <div
                          key={part.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(part.id))
                            e.dataTransfer.effectAllowed = 'copy'
                            onDragStartPart(part)
                          }}
                          onDragEnd={onDragEndPart}
                          onClick={() => setSelectedPart(part)}
                          className="flex cursor-grab items-center gap-2 rounded-md border bg-card p-2 transition-colors select-none hover:border-primary/50 hover:bg-muted active:cursor-grabbing"
                        >
                          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{part.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
