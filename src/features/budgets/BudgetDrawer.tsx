import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Budget } from '@/features/budgets/api'
import { createBudget, fetchBudgetPartsForCategory, updateBudget } from '@/features/budgets/api'
import { fetchCategories } from '@/features/categories/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const NONE_CATEGORY = '__tanpa_kategori__'
const WEEKS_PER_YEAR = 52

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

interface BudgetDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number
  editingBudget: Budget | null
}

function reportError(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  toast.error(message)
}

/**
 * On-demand slide-in panel (only mounted/visible while `open`, unlike the
 * always-open Location/Supplier drawers) for creating or editing a
 * category budget. Per part: "estimasi life time (%)" is a safety margin
 * on the part's rated lifetime hours (100% = the full rated life is
 * assumed reached before replacement; 90% = a conservative assumption
 * that it only reaches 90% of that, which means MORE frequent replacement,
 * not less) and "estimasi kenaikan harga (%)" inflates the unit cost for
 * the budget year — both combine with the branch's average weekly
 * operating hours (Pengaturan > Profil Perusahaan, same setting PM
 * Schedule uses) to estimate pcs/year needed. The preview here is
 * computed client-side from the same formula the server uses so the
 * numbers match, but the persisted total is always recomputed
 * server-side from the percentages alone — a stale/tampered cost can't
 * sneak in through this form.
 */
export function BudgetDrawer({ open, onOpenChange, branchId, editingBudget }: BudgetDrawerProps) {
  const isEdit = !!editingBudget
  const queryClient = useQueryClient()

  const [category, setCategory] = useState(NONE_CATEGORY)
  const [year, setYear] = useState(String(new Date().getFullYear() + 1))
  const [lifetimePercentByPart, setLifetimePercentByPart] = useState<Record<number, string>>({})
  const [priceIncreaseByPart, setPriceIncreaseByPart] = useState<Record<number, string>>({})
  const [correctiveAmount, setCorrectiveAmount] = useState('0')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return

    if (editingBudget) {
      setCategory(editingBudget.category || NONE_CATEGORY)
      setYear(String(editingBudget.year))
      setCorrectiveAmount(editingBudget.corrective_amount)
      setNotes(editingBudget.notes ?? '')
      const lifetime: Record<number, string> = {}
      const increase: Record<number, string> = {}
      editingBudget.items.forEach((item) => {
        lifetime[item.part_id] = item.estimated_lifetime_percent
        increase[item.part_id] = item.price_increase_percent
      })
      setLifetimePercentByPart(lifetime)
      setPriceIncreaseByPart(increase)
    } else {
      setCategory(NONE_CATEGORY)
      setYear(String(new Date().getFullYear() + 1))
      setLifetimePercentByPart({})
      setPriceIncreaseByPart({})
      setCorrectiveAmount('0')
      setNotes('')
    }
  }, [open, editingBudget])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: open,
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
    enabled: open,
  })

  const effectiveCategory = category === NONE_CATEGORY ? '' : category

  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ['budget-parts', branchId, effectiveCategory],
    queryFn: () => fetchBudgetPartsForCategory(branchId, effectiveCategory),
    enabled: open && !!category,
  })

  function setLifetimePercent(partId: number, value: string) {
    setLifetimePercentByPart((prev) => ({ ...prev, [partId]: value }))
  }

  function setPriceIncrease(partId: number, value: string) {
    setPriceIncreaseByPart((prev) => ({ ...prev, [partId]: value }))
  }

  const avgWeeklyHours = companySetting?.avg_weekly_operating_hours || 85
  const hoursPerYear = avgWeeklyHours * WEEKS_PER_YEAR

  const rows = (parts ?? []).map((part) => {
    const lifetimePercent = Number(lifetimePercentByPart[part.part_id]) || 100
    const priceIncreasePercent = Number(priceIncreaseByPart[part.part_id]) || 0
    const hasLifetimeData = part.estimated_lifetime_hours != null && part.estimated_lifetime_hours > 0
    const effectiveLifetimeHours = hasLifetimeData ? part.estimated_lifetime_hours! * (lifetimePercent / 100) : 0
    const pcsPerYear = effectiveLifetimeHours > 0 ? hoursPerYear / effectiveLifetimeHours : 0
    const adjustedUnitCost = Number(part.unit_cost) * (1 + priceIncreasePercent / 100)
    const cost = pcsPerYear * part.active_installations * adjustedUnitCost
    return { ...part, lifetimePercent, priceIncreasePercent, hasLifetimeData, pcsPerYear, cost }
  })
  const plannedTotal = rows.reduce((sum, r) => sum + r.cost, 0)
  const estimableRows = rows.filter((r) => r.hasLifetimeData)
  const missingLifetimeRows = rows.filter((r) => !r.hasLifetimeData)

  const mutation = useMutation({
    mutationFn: () => {
      const items = estimableRows.map((r) => ({
        part_id: r.part_id,
        estimated_lifetime_percent: r.lifetimePercent,
        price_increase_percent: r.priceIncreasePercent,
      }))
      const payload = {
        corrective_amount: Number(correctiveAmount) || 0,
        notes: notes || null,
        items,
      }
      return isEdit
        ? updateBudget(editingBudget!.id, payload)
        : createBudget(branchId, { ...payload, category: effectiveCategory, year: Number(year) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', branchId] })
      toast.success(isEdit ? 'Budget berhasil diperbarui.' : 'Budget berhasil ditambahkan.')
      onOpenChange(false)
    },
    onError: (error: unknown) =>
      reportError(error, 'Gagal menyimpan budget. Kategori & tahun ini mungkin sudah punya budget.'),
  })

  const canSave = !mutation.isPending && estimableRows.length > 0 && (isEdit || !!year)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full gap-4 overflow-y-auto sm:max-w-lg" showOverlay={false}>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Ubah Budget' : 'Tambah Budget'}</SheetTitle>
          <SheetDescription>
            Per kategori part — hasil dihitung dari estimasi umur pakai & jam operasi mingguan, lalu
            ditampilkan per Line.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Kategori Part</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? NONE_CATEGORY)} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_CATEGORY}>Tanpa Kategori</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-year">Tahun Anggaran</Label>
              <Input
                id="budget-year"
                type="number"
                disabled={isEdit}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Jam operasi mingguan dipakai: <strong>{avgWeeklyHours} jam</strong> (ubah di Pengaturan &gt; Profil
            Perusahaan).
          </p>

          {partsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : parts?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada part aktif di kategori ini.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.part_id} className="flex flex-col gap-2 rounded-md border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.part_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.item_master_no} · {currencyFormatter.format(Number(row.unit_cost))}/unit ·{' '}
                      {row.active_installations} unit terpasang
                    </p>
                  </div>

                  {!row.hasLifetimeData ? (
                    <p className="text-xs text-warning">
                      Belum ada data estimasi umur pakai (jam) untuk part ini — tidak diikutkan dalam
                      perhitungan.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Estimasi Life Time (%)</Label>
                          <Input
                            type="number"
                            min={1}
                            step="1"
                            className="h-8"
                            value={lifetimePercentByPart[row.part_id] ?? '100'}
                            onChange={(e) => setLifetimePercent(row.part_id, e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Estimasi Kenaikan Harga (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            className="h-8"
                            value={priceIncreaseByPart[row.part_id] ?? '0'}
                            onChange={(e) => setPriceIncrease(row.part_id, e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="text-right text-xs tabular-nums text-muted-foreground">
                        ≈ {row.pcsPerYear.toFixed(2)} pcs/tahun · {currencyFormatter.format(row.cost)}/tahun
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {missingLifetimeRows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {missingLifetimeRows.length} part belum bisa diestimasi — lengkapi data umur pakai part-nya
              dulu di halaman Part.
            </p>
          )}

          {estimableRows.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              Total estimasi: <strong>{currencyFormatter.format(plannedTotal)}</strong> / tahun
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="corrective">Tambahan Anggaran Corrective</Label>
            <Input
              id="corrective"
              type="number"
              step="0.01"
              value={correctiveAmount}
              onChange={(e) => setCorrectiveAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-notes">Catatan</Label>
            <Textarea id="budget-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button onClick={() => mutation.mutate()} disabled={!canSave}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Budget'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
