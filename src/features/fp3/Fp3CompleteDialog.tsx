import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleDot, FileWarning, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { completeFp3Request, type Fp3Disposition, type Fp3Request } from '@/features/fp3/api'
import { fetchParts } from '@/features/parts/api'
import { cn } from '@/lib/utils'
import { FormSheet } from '@/components/FormSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const dispositionOptions: { value: Fp3Disposition; label: string; icon: typeof CircleDot }[] = [
  { value: 'open', label: 'Open', icon: CircleDot },
  { value: 'closed', label: 'Closed', icon: CircleCheck },
  { value: 'closed_with_note', label: 'Closed with Note', icon: FileWarning },
]

const formSchema = z.object({
  work_description: z.string().min(1, 'Uraian pekerjaan wajib diisi'),
  executor_names: z.string().min(1, 'Nama pelaksana wajib diisi').max(255),
  area_condition_after: z.string().min(1, 'Kondisi area wajib diisi'),
  disposition: z.enum(['open', 'closed', 'closed_with_note']),
  disposition_note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PartRow {
  partId: number
  partName: string
  itemMasterNo: string
  quantity: string
  notes: string
}

interface Fp3CompleteDialogProps {
  fp3: Fp3Request
  invalidateKeys: unknown[][]
  trigger: React.ReactNode
}

/**
 * The Engineer's report — everything on the FP3 paper form's "Diisi oleh
 * Departemen Pelaksana FP3" section. Spare parts used are picked only from
 * Part records already registered in the system (never free text) and are
 * issued out of stock the moment this submits — see Fp3RequestService::
 * complete()'s own docblock for why there's no separate approval step here.
 */
export function Fp3CompleteDialog({ fp3, invalidateKeys, trigger }: Fp3CompleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [parts, setParts] = useState<PartRow[]>([])
  const [selectedPartId, setSelectedPartId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: allParts } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
    enabled: open,
  })
  const availableParts = allParts?.filter((part) => !parts.some((row) => row.partId === part.id))

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_description: '',
      executor_names: '',
      area_condition_after: '',
      disposition: 'closed',
      disposition_note: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        work_description: '',
        executor_names: '',
        area_condition_after: '',
        disposition: 'closed',
        disposition_note: '',
      })
      setParts([])
      setSelectedPartId('')
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [open, reset])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  function addPartRow() {
    const part = allParts?.find((p) => p.id === Number(selectedPartId))
    if (!part) return
    setParts((prev) => [
      ...prev,
      { partId: part.id, partName: part.name, itemMasterNo: part.item_master_no, quantity: '1', notes: '' },
    ])
    setSelectedPartId('')
  }

  function removePartRow(partId: number) {
    setParts((prev) => prev.filter((row) => row.partId !== partId))
  }

  function updatePartRow(partId: number, patch: Partial<Pick<PartRow, 'quantity' | 'notes'>>) {
    setParts((prev) => prev.map((row) => (row.partId === partId ? { ...row, ...patch } : row)))
  }

  const disposition = watch('disposition')

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      completeFp3Request(fp3.id, {
        ...values,
        disposition_note: values.disposition_note || undefined,
        photo: photoFile,
        parts: parts.map((row) => ({
          part_id: row.partId,
          quantity: Math.max(1, Math.trunc(Number(row.quantity)) || 1),
          notes: row.notes || undefined,
        })),
      }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success('Laporan FP3 berhasil disimpan.')
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message ?? 'Gagal menyimpan laporan FP3.')
    },
  })

  return (
    <FormSheet
      trigger={trigger}
      title={`Laporan FP3 — ${fp3.code}`}
      description={`Pengaju: ${fp3.requester_name} (${fp3.department})`}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty || parts.length > 0 || photoFile !== null}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan Laporan"
      isSubmitting={mutation.isPending}
    >
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Deskripsi Permintaan</p>
        <p className="text-muted-foreground">{fp3.description}</p>
        <img src={fp3.request_photo_url} alt="Foto permintaan" className="mt-2 max-h-40 rounded-md border object-cover" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="work_description">Uraian Pekerjaan</Label>
        <Textarea id="work_description" rows={3} {...register('work_description')} />
        {errors.work_description && <p className="text-sm text-destructive">{errors.work_description.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="executor_names">Nama Pelaksana</Label>
        <Input id="executor_names" placeholder="Misal: Budi, Anto" {...register('executor_names')} />
        <p className="text-xs text-muted-foreground">Pisahkan dengan koma kalau lebih dari satu orang.</p>
        {errors.executor_names && <p className="text-sm text-destructive">{errors.executor_names.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="area_condition_after">Kondisi Area Setelah Pengerjaan</Label>
        <Textarea id="area_condition_after" rows={2} {...register('area_condition_after')} />
        {errors.area_condition_after && (
          <p className="text-sm text-destructive">{errors.area_condition_after.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Foto Hasil Pengerjaan</Label>
        <div className="flex items-center gap-3">
          {photoPreview ? (
            <img src={photoPreview} alt="Pratinjau" className="size-16 shrink-0 rounded-md border object-cover" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed text-center text-[10px] text-muted-foreground">
              Opsional
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <Label>Spare Part Yang Dipakai</Label>
          <p className="text-xs text-muted-foreground">Hanya part yang sudah terdaftar di sistem — ini juga jadi jalur keluar stock.</p>
        </div>

        {parts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {parts.map((row) => (
              <div key={row.partId} className="flex items-center gap-2 rounded-md border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.partName}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{row.itemMasterNo}</p>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updatePartRow(row.partId, { quantity: e.target.value })}
                  className="h-8 w-16 shrink-0 text-center"
                  aria-label={`Jumlah ${row.partName}`}
                />
                <Input
                  value={row.notes}
                  onChange={(e) => updatePartRow(row.partId, { notes: e.target.value })}
                  placeholder="Keterangan"
                  className="h-8 w-32 shrink-0"
                  aria-label={`Keterangan ${row.partName}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${row.partName}`}
                  onClick={() => removePartRow(row.partId)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select value={selectedPartId} onValueChange={(value) => setSelectedPartId(value ?? '')}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Pilih part..." />
            </SelectTrigger>
            <SelectContent>
              {availableParts?.map((part) => (
                <SelectItem key={part.id} value={String(part.id)}>
                  {part.name} ({part.item_master_no})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" disabled={!selectedPartId} onClick={addPartRow}>
            Tambah
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Controller
          control={control}
          name="disposition"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {dispositionOptions.map((option) => {
                const Icon = option.icon
                const selected = field.value === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border p-2.5 text-xs font-medium transition-colors',
                      selected ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {disposition !== 'closed' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="disposition_note">Catatan</Label>
          <Textarea
            id="disposition_note"
            rows={2}
            placeholder={disposition === 'open' ? 'Kenapa masih open / tindak lanjut apa yang diperlukan' : 'Catatan penutupan'}
            {...register('disposition_note')}
          />
        </div>
      )}
    </FormSheet>
  )
}
