import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPart, updatePart } from '@/features/parts/api'
import { partReplacementStrategyOptions, partSchema, type PartFormValues } from '@/features/parts/schema'
import { fetchUnits } from '@/features/units/api'
import { cn } from '@/lib/utils'
import type { Part } from '@/types/inventory'
import { FormSheet } from '@/components/FormSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PartFormDialogProps {
  part?: Part
  trigger: React.ReactNode
}

export function PartFormDialog({ part, trigger }: PartFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(part?.image_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const isEdit = Boolean(part)

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: fetchUnits,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      item_master_no: part?.item_master_no ?? '',
      name: part?.name ?? '',
      description: part?.description ?? '',
      unit: part?.unit ?? 'pcs',
      estimated_lifetime_hours: part?.estimated_lifetime_hours ? String(part.estimated_lifetime_hours) : '',
      replacement_strategy: part?.replacement_strategy ?? 'on_demand',
    },
  })

  const replacementStrategy = watch('replacement_strategy')

  useEffect(() => {
    if (open) {
      reset({
        item_master_no: part?.item_master_no ?? '',
        name: part?.name ?? '',
        description: part?.description ?? '',
        unit: part?.unit ?? 'pcs',
        estimated_lifetime_hours: part?.estimated_lifetime_hours ? String(part.estimated_lifetime_hours) : '',
        replacement_strategy: part?.replacement_strategy ?? 'on_demand',
      })
      setImageFile(null)
      setImagePreview(part?.image_url ?? null)
    }
  }, [open, part, reset])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : (part?.image_url ?? null))
  }

  const mutation = useMutation({
    mutationFn: (values: PartFormValues) => {
      const payload = {
        ...values,
        estimated_lifetime_hours: values.estimated_lifetime_hours
          ? Number(values.estimated_lifetime_hours)
          : null,
        image: imageFile,
      }
      return isEdit ? updatePart(part!.id, payload) : createPart(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success(isEdit ? 'Part berhasil diperbarui.' : 'Part berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => {
      toast.error('Gagal menyimpan part. Periksa kembali data yang diisi.')
    },
  })

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Part' : 'Tambah Part'}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty || imageFile !== null}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="item_master_no">Item Master</Label>
        <Input id="item_master_no" {...register('item_master_no')} />
        {errors.item_master_no && <p className="text-sm text-destructive">{errors.item_master_no.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="unit">Satuan</Label>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="unit">
                <SelectValue placeholder="Pilih satuan" />
              </SelectTrigger>
              <SelectContent>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.name}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input id="description" {...register('description')} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Strategi Penggantian</Label>
        <p className="-mt-1 text-xs text-muted-foreground">
          Menentukan kapan part ini dianggap perlu diganti — dasar dari penjadwalan otomatis untuk Life
          Based, dan hanya sebagai informasi untuk strategi lainnya.
        </p>
        <Controller
          control={control}
          name="replacement_strategy"
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {partReplacementStrategyOptions.map((option) => {
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
      </div>
      {replacementStrategy === 'life_based' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="estimated_lifetime_hours">Perkiraan Umur Pakai (jam operasional)</Label>
          <Input
            id="estimated_lifetime_hours"
            type="number"
            min={1}
            placeholder="Misal: 2000"
            {...register('estimated_lifetime_hours')}
          />
          <p className="text-xs text-muted-foreground">
            Dipakai untuk menghitung sisa umur pakai part saat terpasang di equipment, dan menjadi dasar
            penjadwalan otomatis penggantian. Kosongkan kalau belum tahu perkiraannya.
          </p>
          {errors.estimated_lifetime_hours && (
            <p className="text-sm text-destructive">{errors.estimated_lifetime_hours.message}</p>
          )}
        </div>
      ) : (
        part?.estimated_lifetime_hours && (
          <p className="text-xs text-muted-foreground">
            Part ini pernah punya data perkiraan umur pakai ({part.estimated_lifetime_hours} jam) dari saat
            strateginya masih Life Based. Data itu tetap tersimpan, tapi tidak lagi dipakai untuk
            penjadwalan otomatis selama strateginya bukan Life Based.
          </p>
        )
      )}
      <div className="flex flex-col gap-2">
        <Label>Foto Part</Label>
        <div className="flex items-center gap-3">
          {imagePreview ? (
            <img src={imagePreview} alt="Pratinjau" className="size-16 shrink-0 rounded-md border object-cover" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed text-center text-[10px] text-muted-foreground">
              Belum ada foto
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? 'Ganti Foto' : 'Pilih Foto'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </div>
    </FormSheet>
  )
}
