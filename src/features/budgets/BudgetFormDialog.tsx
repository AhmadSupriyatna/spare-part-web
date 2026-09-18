import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createBudget, estimateBudget, updateBudget, type Budget, type BudgetEstimate } from '@/features/budgets/api'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const NONE_CATEGORY = '__tanpa_kategori__'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

const budgetSchema = z.object({
  category: z.string(),
  year: z
    .string()
    .min(1, 'Tahun wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 2020 && Number(val) <= 2100, 'Tahun tidak valid'),
  planned_amount: z
    .string()
    .min(1, 'Anggaran terencana wajib diisi')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, 'Jumlah tidak valid'),
  corrective_amount: z
    .string()
    .optional()
    .refine((val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0), 'Jumlah tidak valid'),
  notes: z.string().optional(),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetFormDialogProps {
  branchId: number
  budget?: Budget
  trigger: React.ReactNode
}

/**
 * Category & year identify which budget this is (see UpdateBudgetRequest on
 * the backend, which doesn't accept them) — both are locked once a budget
 * already exists, only the amounts/notes stay editable.
 */
export function BudgetFormDialog({ branchId, budget, trigger }: BudgetFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [estimateResult, setEstimateResult] = useState<BudgetEstimate | null>(null)
  const queryClient = useQueryClient()
  const isEdit = Boolean(budget)

  const { data: partStocks } = useQuery({
    queryKey: ['part-stocks', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId),
    enabled: open,
  })

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const stock of partStocks ?? []) {
      if (stock.category) set.add(stock.category)
    }
    return Array.from(set).sort()
  }, [partStocks])

  const defaultValues = useMemo<BudgetFormValues>(
    () => ({
      category: budget?.category || NONE_CATEGORY,
      year: String(budget?.year ?? new Date().getFullYear() + 1),
      planned_amount: budget ? budget.planned_amount : '0',
      corrective_amount: budget ? budget.corrective_amount : '0',
      notes: budget?.notes ?? '',
    }),
    [budget],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormValues>({ resolver: zodResolver(budgetSchema), defaultValues })

  useEffect(() => {
    if (open) {
      setEstimateResult(null)
      reset(defaultValues)
    }
  }, [open, defaultValues, reset])

  const category = watch('category')

  const estimateMutation = useMutation({
    mutationFn: () => estimateBudget(branchId, category === NONE_CATEGORY ? '' : category),
    onSuccess: (result) => {
      setEstimateResult(result)
      setValue('planned_amount', result.planned_amount)
    },
    onError: () => toast.error('Gagal menghitung estimasi.'),
  })

  const mutation = useMutation({
    mutationFn: (values: BudgetFormValues) => {
      const payload = {
        category: values.category === NONE_CATEGORY ? '' : values.category,
        year: Number(values.year),
        planned_amount: Number(values.planned_amount),
        corrective_amount: values.corrective_amount ? Number(values.corrective_amount) : 0,
        notes: values.notes || null,
      }
      return isEdit ? updateBudget(budget!.id, payload) : createBudget(branchId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', branchId] })
      toast.success(isEdit ? 'Budget berhasil diperbarui.' : 'Budget berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan budget. Kategori & tahun ini mungkin sudah punya budget.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Budget' : 'Tambah Budget'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Kategori Part</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_CATEGORY}>Tanpa Kategori</SelectItem>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="year">Tahun</Label>
              <Input id="year" type="number" disabled={isEdit} {...register('year')} />
              {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
            </div>
          </div>

          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => estimateMutation.mutate()}
              disabled={estimateMutation.isPending}
            >
              <Calculator className="size-3.5" />
              {estimateMutation.isPending ? 'Menghitung...' : 'Hitung Estimasi dari Life Time Part'}
            </Button>
          )}

          {estimateResult && (
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <p>
                Estimasi dari <strong>{estimateResult.items.length}</strong> jenis part yang punya data umur pakai:{' '}
                <strong>{currencyFormatter.format(Number(estimateResult.planned_amount))}</strong> / tahun.
              </p>
              {estimateResult.items.length > 0 && (
                <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {estimateResult.items.map((item) => (
                    <li key={item.part_id}>
                      {item.part_name} — {item.active_installations} unit terpasang ×{' '}
                      {item.expected_replacements_per_year}x/tahun ≈{' '}
                      {currencyFormatter.format(Number(item.estimated_cost))}
                    </li>
                  ))}
                </ul>
              )}
              {estimateResult.excluded_parts.length > 0 && (
                <div className="flex flex-col gap-1 text-xs">
                  <p className="text-muted-foreground">Belum bisa diestimasi (belum ada data umur pakai):</p>
                  <div className="flex flex-wrap gap-1">
                    {estimateResult.excluded_parts.map((part) => (
                      <Badge key={part.part_id} variant="outline">
                        {part.part_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="planned_amount">Anggaran Terencana (PM / Life Cycle)</Label>
            <Input id="planned_amount" type="number" step="0.01" {...register('planned_amount')} />
            {errors.planned_amount && <p className="text-sm text-destructive">{errors.planned_amount.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="corrective_amount">Tambahan Anggaran Corrective (Breakdown)</Label>
            <Input id="corrective_amount" type="number" step="0.01" {...register('corrective_amount')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" {...register('notes')} />
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
